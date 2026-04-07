import { Router, Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import { UserCrud } from '../crud/user.crud.js';
import prisma from '../lib/prisma.js';
import { ConflictError, AuthenticationError } from '../middleware/errorHandler.js';
import { env } from '../config/env.js';
import { sendEmail } from '../services/email.service.js';
import inAppNotificationService from '../services/inAppNotification.service.js';
import { supabase } from '../lib/supabase.js';
import { AuditService } from '../services/audit.service.js';

const router = Router();

// Validação do corpo da requisição para login
const loginValidation = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Senha obrigatória'),
];

// Validação para registro
const registerValidation = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
  body('name').trim().isLength({ min: 3 }).withMessage('Nome deve ter pelo menos 3 caracteres'),
  body('role').optional().isIn(['PATIENT', 'PARTNER', 'ADMIN', 'PHARMACY']).withMessage('Role inválido'),
];

// Middleware para tratamento de erros de validação
function handleValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorArray = errors.array();
    logger.warn('[auth] Erro de validação detectado:', { 
      path: req.path, 
      errors: errorArray,
      body: { ...req.body, password: '***' } 
    });
    return res.status(400).json({ 
      error: 'Erro de validação', 
      details: errorArray 
    });
  }
  next();
}

router.post('/login', loginValidation, handleValidationErrors, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    const { password } = req.body;
    if (!email) return res.status(400).json({ error: 'Email é obrigatório' });
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';

    const isAdminBypass = env.ADMIN_DEV_BYPASS && email === 'rodrigo.vilela@docton.com' && password === '123456';

    if (isAdminBypass) {
      logger.info('[auth] Admin bypass used for login', { email, ip });
      const devUser: any = {
        id: env.ADMIN_DEV_USER_ID,
        email: 'rodrigo.vilela@docton.com',
        name: 'Rodrigo Vilela',
        role: 'ADMIN',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const token = jwt.sign(
        { userId: devUser.id, role: devUser.role, email: devUser.email },
        String(env.JWT_SECRET),
        { expiresIn: env.JWT_EXPIRES_IN as any }
      );

      const { password: _pw, ...userWithoutPassword } = devUser;

      await AuditService.logAuth(devUser.id, 'LOGIN', ip, 'SUCCESS');
      return res.json({ user: userWithoutPassword, token });
    }

    logger.debug('[auth] Normal login attempt', { email, ip });

    let user;
    try {
      user = await UserCrud.findByEmail(email);
    } catch (dbError) {
      logger.error('[auth] Database error during login findByEmail:', dbError);
      return res.status(503).json({ error: 'Serviço de banco de dados temporariamente indisponível' });
    }

    if (!user) {
      logger.warn('[auth] Login failed: user not found', { email, ip });
      await AuditService.logAuth('unknown', 'LOGIN', ip, 'FAILURE');
      throw new AuthenticationError('Usuário não encontrado');
    }

    // Verifica a senha - APENAS HASH BCRYPT É PERMITIDO
    if (typeof user.password !== 'string' || !user.password.startsWith('$2')) {
      logger.error('[auth] Login failed: invalid password format (plain-text or other)', {
        userId: user.id,
        format: typeof user.password === 'string' ? user.password.substring(0, 3) : typeof user.password
      });
      await AuditService.logAuth(user.id, 'LOGIN', ip, 'FAILURE');
      throw new AuthenticationError('Acesso não permitido. Por favor, solicite a recuperação de senha.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      logger.warn('[auth] Login failed: credentials mismatch', { userId: user.id, ip });
      await AuditService.logAuth(user.id, 'LOGIN', ip, 'FAILURE');
      throw new AuthenticationError('Credenciais inválidas');
    }

    logger.info('[auth] Login successful', { userId: user.id, role: user.role });

    // Gera JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email, personId: user.personId },
      String(env.JWT_SECRET),
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    // Retorna dados do usuário e token
    const { password: _p, ...userWithoutPassword } = user;

    // Anexar status de aprovação e tipo de parceiro
    if (user.role === 'PARTNER') {
      const partner = user.partner || await prisma.partner.findUnique({ where: { userId: user.id } });
      (userWithoutPassword as any).isApproved = partner?.isApproved ?? false;
      (userWithoutPassword as any).partnerType = partner?.type ?? 'INDIVIDUAL';
    }

    // Anexar status de aprovação de farmácia
    if (user.role === 'PHARMACY') {
      const pharmacy = user.pharmacy || await prisma.pharmacy.findFirst({ where: { users: { some: { id: user.id } } } });
      (userWithoutPassword as any).isApproved = pharmacy?.isApproved ?? false;
      (userWithoutPassword as any).pharmacyName = pharmacy?.name ?? '';
    }

    // Anexar plano e onboarding se for PATIENT
    if (user.role === 'PATIENT') {
      const patient = (user as any).patient;
      (userWithoutPassword as any).onboardingCompleted = patient?.onboardingCompleted ?? false;
      
      if (patient?.subscriptions?.[0]?.plan) {
        (userWithoutPassword as any).plan = patient.subscriptions[0].plan.key;
      } else {
        (userWithoutPassword as any).plan = 'basic';
      }
    }

    await AuditService.logAuth(user.id, 'LOGIN', ip, 'SUCCESS');
    res.json({ user: userWithoutPassword, token });
  } catch (err) {
    console.error('Login error:', err);
    next(err);
  }
});

// Rota de validação de token
router.get('/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { authenticate } = await import('../middleware/auth.js');

    // Usamos o middleware authenticate para validar o token
    authenticate(req, res, async () => {
      const userId = (req as any).user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Não autorizado' });
      }

      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            partner: true,
            pharmacy: true,
            patient: {
              include: {
                subscriptions: {
                  include: { plan: true },
                  where: { status: 'ACTIVE' },
                  take: 1
                }
              }
            }
          }
        });

        if (!user) {
          return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const { password: _, ...userWithoutPassword } = user;

        // Anexar status de aprovação e tipo de parceiro se for PARTNER
        if (user.role === 'PARTNER') {
          (userWithoutPassword as any).isApproved = user.partner?.isApproved ?? false;
          (userWithoutPassword as any).partnerType = user.partner?.type ?? 'INDIVIDUAL';
        }

        // Anexar status de aprovação de farmácia
        if (user.role === 'PHARMACY') {
          const isApproved = user.pharmacy?.isApproved || (user as any).isApproved || false;
          (userWithoutPassword as any).isApproved = isApproved;
          (userWithoutPassword as any).pharmacyName = user.pharmacy?.name ?? '';
        }

        // Anexar plano e onboarding se for PATIENT
        if (user.role === 'PATIENT') {
          (userWithoutPassword as any).onboardingCompleted = user.patient?.onboardingCompleted ?? false;
          
          if (user.patient?.subscriptions?.[0]?.plan) {
            (userWithoutPassword as any).plan = user.patient.subscriptions[0].plan.key;
          } else {
            (userWithoutPassword as any).plan = 'basic';
          }
        }

        return res.json({ user: userWithoutPassword });
      } catch (dbErr: any) {
        // throw dbErr; 
        return res.status(503).json({ 
          error: 'Serviço de banco de dados indisponível',
          message: dbErr?.message || 'Erro ao consultar banco de dados',
          code: dbErr?.code || 'DB_ERROR'
        });
      }
    });
  } catch (err) {
    next(err);
  }
});

// Rota de registro com envio de email de verificação
router.post('/register', registerValidation, handleValidationErrors, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { password, name, role = 'PATIENT', phone } = req.body;
    const email = req.body.email?.toLowerCase().trim();
    
    logger.info(`--- INICIANDO REGISTRO (V1.0.2) --- Role: ${role}`);

    logger.info('[auth] Iniciando tentativa de registro', { 
      email, 
      name, 
      role, 
      hasPhone: !!phone,
      ip: (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1' 
    });

    if (!email) return res.status(400).json({ error: 'Email é obrigatório' });
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';

    // Verificar se email já existe
    const existingUser = await UserCrud.findByEmail(email);

    if (existingUser) {
      throw new ConflictError('Email já cadastrado');
    }

    // Gerar token de verificação
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 horas

    // Armazenar token no banco
    await prisma.verificationToken.create({
      data: {
        token: verificationToken,
        email,
        expiresAt: new Date(expiresAt)
      }
    });

    // Criar URL de verificação
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário e entidades relacionadas em uma transação para garantir integridade
    const result = await prisma.$transaction(async (tx) => {
      // 1. Criar o usuário
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role,
          phone
        }
      });

      let pharmacy = null;
      let partner = null;
      let patient = null;

      // 2. Criar entidades específicas baseadas no role
      if (role === 'PHARMACY') {
        const { pharmacyName, cnpj } = req.body;
        pharmacy = await tx.pharmacy.create({
          data: {
            name: pharmacyName || name,
            cnpj: cnpj || null,
            isApproved: false
          }
        });

        // Vincular o usuário à farmácia recém-criada
        await tx.user.update({
          where: { id: newUser.id },
          data: { pharmacyId: pharmacy.id }
        });
      } else if (role === 'PARTNER') {
        const { cnpj, specialty, partnerType = 'INDIVIDUAL' } = req.body;
        partner = await tx.partner.create({
          data: {
            userId: newUser.id,
            name: newUser.name,
            type: partnerType,
            cnpj: cnpj || null,
            specialty: specialty || null,
            specialties: specialty ? [specialty] : [],
            isApproved: false
          }
        });
      } else if (role === 'PATIENT') {
        const tempCpf = `TEMP-${Date.now()}`;
        patient = await tx.patient.create({
          data: {
            userId: newUser.id,
            cpf: tempCpf,
            birthDate: new Date(),
          }
        });
      }

      return { newUser, pharmacy, partner, patient };
    });

    const { newUser, pharmacy, partner, patient } = result;

    // Ações pós-transação (não-bloqueantes ou que não dependem da transação)
    
    // Notificações
    if (role === 'PHARMACY' && pharmacy) {
      await inAppNotificationService.createNotification({
        userId: null,
        type: 'pharmacy_approval',
        title: '💊 Nova Farmácia Registrada',
        message: `${pharmacy.name} se cadastrou como farmácia e aguarda aprovação.`,
        priority: 'high',
        link: '/admin/farmacias'
      }).catch(err => logger.error('Erro ao notificar admin sobre nova farmácia:', err));
    } else if (role === 'PARTNER') {
      await inAppNotificationService.createNotification({
        userId: null,
        type: 'partner_approval',
        title: '🆕 Novo Parceiro Registrado',
        message: `${newUser.name} se cadastrou como parceiro e aguarda aprovação.`,
        priority: 'high',
        link: '/admin/aprovacoes'
      }).catch(err => logger.error('Erro ao notificar admin sobre novo parceiro:', err));
    } else if (role === 'PATIENT') {
      await inAppNotificationService.createNotification({
        userId: null,
        type: 'new_user',
        title: '👥 Novo Paciente Registrado',
        message: `O paciente ${newUser.name} acabou de se cadastrar na plataforma.`,
        priority: 'medium',
        link: '/admin/usuarios'
      }).catch(err => logger.error('Erro ao notificar admin sobre novo paciente:', err));
    }

    // Enviar email de verificação (não-bloqueante)
    try {
      if (newUser && email) {
        await sendEmail({
          to: email,
          subject: 'Verifique seu email - Docton Saúde',
          template: 'email-verification',
          data: { name, email, verificationUrl },
        }).catch(err => logger.error('[auth] Erro no catch do sendEmail:', err));
      }
    } catch (emailError) {
      logger.error('[auth] Erro ao enviar email de verificação (não-bloqueante):', emailError);
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: newUser.id },
      include: { pharmacy: true, partner: true, patient: true }
    });

    const { password: _, ...userWithoutPassword } = updatedUser || newUser;

    // Anexar status de aprovação de parceiro (sempre falso no registro novo)
    if (role === 'PARTNER') {
      (userWithoutPassword as any).isApproved = false;
      (userWithoutPassword as any).partnerType = req.body.partnerType || 'INDIVIDUAL';
    }

    // Anexar status de aprovação de farmácia
    if (role === 'PHARMACY') {
      (userWithoutPassword as any).isApproved = false;
      (userWithoutPassword as any).pharmacyName = req.body.pharmacyName || name;
    }

    // Gera JWT para login automático após registro
    const token = jwt.sign(
      { userId: newUser.id, role: newUser.role, email: newUser.email },
      String(env.JWT_SECRET),
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    // Audit Registration
    await AuditService.log({
      userId: newUser.id,
      action: 'REGISTER',
      resource: 'USER',
      ipAddress: ip,
      category: 'AUTH',
      severity: 'LOW',
      status: 'SUCCESS',
      payload: { email, role }
    });

    res.status(201).json({
      message: 'Conta criada com sucesso.',
      user: { 
        ...userWithoutPassword, 
        plan: 'basic',
        onboardingCompleted: false // Novos registros de PATIENT começam com false
      },
      token, // Retorna o token para auto-login
      requiresEmailVerification: false, // Permitir login direto
    });
  } catch (err) {
    // throw err;
    next(err);
  }
});

// Rota para verificar email
router.get('/verify-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, email } = req.query;

    if (!token || !email) {
      return res.status(400).json({ error: 'Token e email são obrigatórios' });
    }

    const tokenData = await prisma.verificationToken.findUnique({
      where: { token: token as string }
    });

    if (!tokenData) {
      return res.status(400).json({ error: 'Token inválido' });
    }

    if (tokenData.email !== email) {
      return res.status(400).json({ error: 'Email não corresponde ao token' });
    }

    if (Date.now() > tokenData.expiresAt.getTime()) {
      await prisma.verificationToken.delete({ where: { token: token as string } });
      return res.status(400).json({ error: 'Token expirado' });
    }

    // Marcar email como verificado no banco
    const user = await UserCrud.findByEmail(email as string);
    if (user) {
      await UserCrud.update(user.id, { emailVerified: true });
    } else {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Remover token usado
    await prisma.verificationToken.delete({ where: { token: token as string } });

    res.json({ message: 'Email verificado com sucesso' });
  } catch (err) {
    next(err);
  }
});

// Rota para reenviar email de verificação
router.post('/resend-verification', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    const user = await UserCrud.findByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar se já está verificado
    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email já verificado' });
    }

    // Gerar novo token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

    // Armazenar novo token no banco
    await prisma.verificationToken.create({
      data: {
        token: verificationToken,
        email,
        expiresAt: new Date(expiresAt)
      }
    });

    // Criar URL de verificação
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;

    // Enviar email
    try {
      await sendEmail({
        to: email,
        subject: 'Verifique seu email - Docton Saúde',
        template: 'email-verification',
        data: {
          name: user.name,
          email,
          verificationUrl,
        },
      });

      res.json({ message: 'Email de verificação reenviado com sucesso' });
    } catch (emailError) {
      console.error('Erro ao reenviar email:', emailError);
      throw new Error('Erro ao reenviar email de verificação');
    }
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.APP_URL || 'http://localhost:5173'}/reset-password`,
    });

    if (error) {
      console.error('Supabase forgot-password error:', error);
      return res.status(error.status || 500).json({ error: error.message });
    }

    res.json({ message: 'Se o email existir, enviaremos instruções para recuperação.' });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { newPassword } = req.body || {};
    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'Nova senha é obrigatória' });
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      console.error('Supabase reset-password error:', error);
      return res.status(error.status || 500).json({ error: error.message });
    }

    res.json({ message: 'Senha atualizada com sucesso' });
  } catch (err) {
    next(err);
  }
});

export default router;
