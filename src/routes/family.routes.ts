import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { z } from 'zod';

const router = Router();

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['DEPENDENT', 'HEAD']).default('DEPENDENT')
});

/**
 * GET /api/family/me
 * Retorna os dados do grupo familiar do usuário logado
 */
router.get('/me', authenticate, authorize('PATIENT'), async (req: any, res: any) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { userId: req.user?.userId },
      include: {
        familyGroup: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                    avatar: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!patient?.familyGroupId) {
      return res.status(200).json({ hasFamily: false });
    }

    res.json({
      hasFamily: true,
      familyGroup: patient.familyGroup
    });
  } catch (error) {
    console.error('[Family Error]', error);
    res.status(500).json({ error: 'Erro ao buscar dados da família' });
  }
});

/**
 * POST /api/family
 * Cria um novo grupo familiar (o usuário logado se torna o HEAD)
 */
router.post('/', authenticate, authorize('PATIENT'), async (req: any, res: any) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { userId: req.user?.userId }
    });

    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });
    if (patient.familyGroupId) return res.status(400).json({ error: 'Você já pertence a um grupo familiar' });

    const familyGroup = await prisma.familyGroup.create({
      data: {
        name: `Família ${req.user?.name?.split(' ')[0] || 'Nova'}`,
        ownerId: patient.id,
        members: {
          connect: { id: patient.id }
        }
      }
    });

    // Atualizar o papel do paciente para HEAD
    await prisma.patient.update({
      where: { id: patient.id },
      data: { familyRole: 'HEAD' }
    });

    res.status(201).json(familyGroup);
  } catch (error) {
    console.error('[Family Create Error]', error);
    res.status(500).json({ error: 'Erro ao criar grupo familiar' });
  }
});

/**
 * POST /api/family/invite
 * Convida um membro existente para o grupo familiar
 */
router.post('/invite', authenticate, authorize('PATIENT'), async (req: any, res: any) => {
  try {
    const { email } = InviteSchema.parse(req.body);
    
    // Buscar o grupo do usuário logado
    const headPatient = await prisma.patient.findUnique({
      where: { userId: req.user?.userId },
      include: { familyGroup: true }
    });

    if (!headPatient?.familyGroup) {
      return res.status(400).json({ error: 'Você precisa criar um grupo familiar primeiro' });
    }

    if (headPatient.familyRole !== 'HEAD') {
      return res.status(403).json({ error: 'Apenas o responsável pelo grupo pode convidar membros' });
    }

    // Buscar o usuário a ser convidado
    const targetUser = await prisma.user.findUnique({
      where: { email },
      include: { 
        person: { 
          include: { 
            patient: true 
          } 
        } 
      }
    });

    if (!targetUser?.person?.patient) {
      return res.status(404).json({ error: 'Usuário não encontrado ou não é um paciente' });
    }

    const targetPatient = targetUser.person.patient;

    if (targetPatient.familyGroupId) {
      return res.status(400).json({ error: 'Este usuário já pertence a um grupo familiar' });
    }

    // Vincular ao grupo
    const updatedPatient = await prisma.patient.update({
      where: { id: targetPatient.id },
      data: {
        familyGroupId: headPatient.familyGroupId,
        familyRole: 'DEPENDENT'
      }
    });

    res.json({ success: true, member: updatedPatient });
  } catch (error) {
    if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    console.error('[Family Invite Error]', error);
    res.status(500).json({ error: 'Erro ao convidar membro' });
  }
});

/**
 * DELETE /api/family/members/:id
 * Remove um membro do grupo familiar (apenas o HEAD pode fazer isso)
 */
router.delete('/members/:id', authenticate, authorize('PATIENT'), async (req: any, res: any) => {
    try {
        const memberId = req.params.id;
        const headPatient = await prisma.patient.findUnique({
            where: { userId: req.user?.userId }
        });

        if (headPatient?.familyRole !== 'HEAD') {
            return res.status(403).json({ error: 'Apenas o responsável pelo grupo pode remover membros' });
        }

        const targetMember = await prisma.patient.findUnique({
            where: { id: memberId }
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
                familyRole: null
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('[Family Remove Error]', error);
        res.status(500).json({ error: 'Erro ao remover membro' });
    }
});

export default router;
