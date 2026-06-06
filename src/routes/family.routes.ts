// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import prisma from '../lib/prisma';
import { z } from 'zod';

const router = Router();

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['DEPENDENT', 'HEAD']).default('DEPENDENT'),
});

function mapFamilyMember(member: any) {
  const user = member.User;
  return {
    id: member.id,
    userId: member.userId || user?.id,
    familyRole: member.familyRole,
    planType: member.planType,
    name: user?.name || 'Membro',
    email: user?.email || '',
    avatar: user?.avatar || null,
    user,
  };
}

/**
 * GET /api/family/me
 * Retorna os dados do grupo familiar do usuário logado
 */
router.get('/me', authenticate, authorize('PATIENT'), async (req: any, res: any) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { userId: req.user?.userId },
      select: {
        id: true,
        userId: true,
        familyGroupId: true,
        familyRole: true,
        planType: true,
        FamilyGroup: {
          include: {
            Patient: {
              include: {
                User: {
                  select: {
                    name: true,
                    email: true,
                    avatar: true,
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!patient?.familyGroupId || !patient.FamilyGroup) {
      return res.status(200).json({ hasFamily: false });
    }

    const familyGroup = patient.FamilyGroup;
    const members = (familyGroup.Patient || []).map(mapFamilyMember);
    const headMember = members.find((m) => m.familyRole === 'HEAD') || members.find((m) => m.id === familyGroup.ownerId);

    res.json({
      hasFamily: true,
      myRole: patient.familyRole,
      isHead: patient.familyRole === 'HEAD',
      familyGroup: {
        id: familyGroup.id,
        name: familyGroup.name,
        ownerId: familyGroup.ownerId,
        headId: familyGroup.ownerId,
        createdAt: familyGroup.createdAt,
        planType: headMember?.planType || patient.planType || 'Gratuito',
        members,
      },
    });
  } catch (error) {
    console.error('[Family Error]', error);
    res.status(500).json({ error: 'Erro ao buscar dados da família', details: (error as Error).message });
  }
});

/**
 * POST /api/family
 * Cria um novo grupo familiar (o usuário logado se torna o HEAD)
 */
router.post('/', authenticate, authorize('PATIENT'), async (req: any, res: any) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { userId: req.user?.userId },
      include: {
        User: { include: { Person: true } },
      },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    if (patient.familyGroupId) {
      return res.status(400).json({ error: 'Você já pertence a um grupo familiar' });
    }

    const userName =
      patient.User?.name ||
      patient.User?.Person?.name ||
      'Família';
    const familyGroupName = `Família ${userName.split(' ')[0]}`;

    const familyGroup = await prisma.familyGroup.create({
      data: {
        name: familyGroupName,
        ownerId: patient.id,
        updatedAt: new Date(),
        Patient: {
          connect: { id: patient.id },
        },
      },
      include: {
        Patient: {
          include: {
            User: { select: { name: true, email: true, avatar: true, id: true } },
          },
        },
      },
    });

    await prisma.patient.update({
      where: { id: patient.id },
      data: {
        familyRole: 'HEAD',
        familyGroupId: familyGroup.id,
        updatedAt: new Date(),
      },
    });

    const members = (familyGroup.Patient || []).map(mapFamilyMember);

    res.status(201).json({
      ...familyGroup,
      headId: familyGroup.ownerId,
      planType: patient.planType || 'Gratuito',
      members,
    });
  } catch (error) {
    console.error('[Family Create Error]', error);
    res.status(500).json({ error: 'Erro ao criar grupo familiar', details: (error as Error).message });
  }
});

/**
 * POST /api/family/invite
 * Vincula um paciente existente (por e-mail) ao grupo familiar
 */
const inviteMemberHandler = async (req: any, res: any) => {
  try {
    const { email } = InviteSchema.parse(req.body);

    const headPatient = await prisma.patient.findUnique({
      where: { userId: req.user?.userId },
      select: { id: true, familyRole: true, familyGroupId: true },
    });

    if (!headPatient?.familyGroupId) {
      return res.status(400).json({ error: 'Você precisa criar um grupo familiar primeiro' });
    }

    if (headPatient.familyRole !== 'HEAD') {
      return res.status(403).json({ error: 'Apenas o responsável pelo grupo pode convidar membros' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { email },
      include: {
        Patient: { select: { id: true, familyGroupId: true, userId: true } },
      },
    });

    if (!targetUser?.Patient) {
      return res.status(404).json({ error: 'Usuário não encontrado ou não é um paciente' });
    }

    const targetPatient = targetUser.Patient;

    if (targetPatient.familyGroupId) {
      return res.status(400).json({ error: 'Este usuário já pertence a um grupo familiar' });
    }

    const updatedPatient = await prisma.patient.update({
      where: { id: targetPatient.id },
      data: {
        familyGroupId: headPatient.familyGroupId,
        familyRole: 'DEPENDENT',
        updatedAt: new Date(),
      },
      include: {
        User: { select: { name: true, email: true, avatar: true, id: true } },
      },
    });

    res.json({ success: true, member: mapFamilyMember(updatedPatient) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    console.error('[Family Invite Error]', error);
    res.status(500).json({ error: 'Erro ao convidar membro', details: (error as Error).message });
  }
};

// POST /api/family/invite e /api/patients/family/invite
router.post('/invite', authenticate, authorize('PATIENT'), inviteMemberHandler);
router.post('/members/invite', authenticate, authorize('PATIENT'), inviteMemberHandler);

/**
 * DELETE /api/family/members/:id
 * Remove um membro do grupo familiar (apenas o HEAD)
 */
router.delete('/members/:id', authenticate, authorize('PATIENT'), async (req: any, res: any) => {
  try {
    const memberId = req.params.id;
    const headPatient = await prisma.patient.findUnique({
      where: { userId: req.user?.userId },
      select: { id: true, familyRole: true, familyGroupId: true },
    });

    if (headPatient?.familyRole !== 'HEAD') {
      return res.status(403).json({ error: 'Apenas o responsável pelo grupo pode remover membros' });
    }

    const targetMember = await prisma.patient.findUnique({
      where: { id: memberId },
      select: { id: true, familyGroupId: true },
    });

    if (!targetMember || targetMember.familyGroupId !== headPatient.familyGroupId) {
      return res.status(404).json({ error: 'Membro não encontrado no seu grupo' });
    }

    if (targetMember.id === headPatient.id) {
      return res.status(400).json({ error: 'Você não pode se remover do próprio grupo como responsável' });
    }

    await prisma.patient.update({
      where: { id: memberId },
      data: {
        familyGroupId: null,
        familyRole: null,
        updatedAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[Family Remove Error]', error);
    res.status(500).json({ error: 'Erro ao remover membro', details: (error as Error).message });
  }
});

export default router;
