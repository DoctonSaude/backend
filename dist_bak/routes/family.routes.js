"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const prisma_1 = __importDefault(require("../lib/prisma"));
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const InviteSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    role: zod_1.z.enum(['DEPENDENT', 'HEAD']).default('DEPENDENT')
});
/**
 * GET /api/family/me
 * Retorna os dados do grupo familiar do usuário logado
 */
router.get('/me', auth_1.authenticate, (0, auth_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const patient = await prisma_1.default.patient.findUnique({
            where: { userId: req.user?.userId },
            select: {
                id: true,
                userId: true,
                familyGroupId: true,
                familyRole: true,
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
    }
    catch (error) {
        console.error('[Family Error]', error);
        res.status(500).json({ error: 'Erro ao buscar dados da família' });
    }
});
/**
 * POST /api/family
 * Cria um novo grupo familiar (o usuário logado se torna o HEAD)
 */
router.post('/', auth_1.authenticate, (0, auth_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const patient = await prisma_1.default.patient.findUnique({
            where: { userId: req.user?.userId },
            select: { id: true, familyGroupId: true }
        });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        if (patient.familyGroupId)
            return res.status(400).json({ error: 'Você já pertence a um grupo familiar' });
        const familyGroup = await prisma_1.default.familyGroup.create({
            data: {
                name: `Família ${req.user?.name?.split(' ')[0] || 'Nova'}`,
                ownerId: patient.id,
                members: {
                    connect: { id: patient.id }
                }
            }
        });
        // Atualizar o papel do paciente para HEAD
        await prisma_1.default.patient.update({
            where: { id: patient.id },
            data: { familyRole: 'HEAD' }
        });
        res.status(201).json(familyGroup);
    }
    catch (error) {
        console.error('[Family Create Error]', error);
        res.status(500).json({ error: 'Erro ao criar grupo familiar' });
    }
});
/**
 * POST /api/family/invite
 * Convida um membro existente para o grupo familiar
 */
router.post('/invite', auth_1.authenticate, (0, auth_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { email } = InviteSchema.parse(req.body);
        // Buscar o grupo do usuário logado
        const headPatient = await prisma_1.default.patient.findUnique({
            where: { userId: req.user?.userId },
            select: { id: true, familyRole: true, familyGroupId: true, familyGroup: true }
        });
        if (!headPatient?.familyGroup) {
            return res.status(400).json({ error: 'Você precisa criar um grupo familiar primeiro' });
        }
        if (headPatient.familyRole !== 'HEAD') {
            return res.status(403).json({ error: 'Apenas o responsável pelo grupo pode convidar membros' });
        }
        // Buscar o usuário a ser convidado
        const targetUser = await prisma_1.default.user.findUnique({
            where: { email },
            select: {
                id: true,
                person: {
                    select: {
                        patient: {
                            select: { id: true, familyGroupId: true }
                        }
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
        const updatedPatient = await prisma_1.default.patient.update({
            where: { id: targetPatient.id },
            data: {
                familyGroupId: headPatient.familyGroupId,
                familyRole: 'DEPENDENT'
            }
        });
        res.json({ success: true, member: updatedPatient });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
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
router.delete('/members/:id', auth_1.authenticate, (0, auth_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const memberId = req.params.id;
        const headPatient = await prisma_1.default.patient.findUnique({
            where: { userId: req.user?.userId },
            select: { id: true, familyRole: true, familyGroupId: true }
        });
        if (headPatient?.familyRole !== 'HEAD') {
            return res.status(403).json({ error: 'Apenas o responsável pelo grupo pode remover membros' });
        }
        const targetMember = await prisma_1.default.patient.findUnique({
            where: { id: memberId },
            select: { id: true, familyGroupId: true }
        });
        if (!targetMember || targetMember.familyGroupId !== headPatient.familyGroupId) {
            return res.status(404).json({ error: 'Membro não encontrado no seu grupo' });
        }
        if (targetMember.id === headPatient.id) {
            return res.status(400).json({ error: 'Você não pode se remover do próprio grupo como responsável' });
        }
        await prisma_1.default.patient.update({
            where: { id: memberId },
            data: {
                familyGroupId: null,
                familyRole: null
            }
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('[Family Remove Error]', error);
        res.status(500).json({ error: 'Erro ao remover membro' });
    }
});
exports.default = router;
//# sourceMappingURL=family.routes.js.map