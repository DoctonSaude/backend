"use strict";
/**
 * ECONOMIA DE XP - CATÁLOGO DE AÇÕES
 * Define todas as ações que concedem Experience Points (XP)
 *
 * ✅ ALINHADO COM DIRETRIZ JORNADA DO HERÓI V1
 *
 * PRINCÍPIOS-CHAVE:
 * 1. Valorizar Consistência sobre Intensidade
 * 2. Recompensar Esforço Real em saúde
 * 3. Incentivar Engajamento Holístico
 *
 * Balanceado para criar progressão significativa e sustentável
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ESTIMATED_XP_PER_PERIOD = exports.XP_ACTIONS_BY_ID = exports.ALL_XP_ACTIONS = exports.MASTERY_ACTIONS = exports.EXPLORATION_ACTIONS = exports.SOCIAL_ACTIONS = exports.CONSISTENCY_ACTIONS = exports.CORE_ACTIONS = void 0;
exports.calculateXP = calculateXP;
exports.canPerformAction = canPerformAction;
/**
 * CATÁLOGO COMPLETO DE AÇÕES
 * Organizado por categoria para facilitar balance
 */
// ==========================================
// CATEGORIA: CORE (Ações Fundamentais)
// ==========================================
exports.CORE_ACTIONS = [
    {
        id: 'daily-checkin',
        name: 'Login Diário',
        description: 'Abrir o app e fazer check-in diário',
        baseXP: 2, // Alinhado com diretriz: +2 XP
        category: 'CORE',
        frequency: 'DAILY',
        multipliers: { streak: 1.05 } // Reduzido para +5% por dia
    },
    {
        id: 'complete-daily-challenge',
        name: 'Desafio Diário Completado',
        description: 'Completar qualquer desafio diário - FONTE PRIMÁRIA DE XP',
        baseXP: 10, // Mantido conforme diretriz
        category: 'CORE',
        frequency: 'UNLIMITED',
        multipliers: { perfect: 1.2 } // Reduzido para +20%
    },
    {
        id: 'complete-weekly-challenge',
        name: 'Desafio Semanal Completado',
        description: 'Completar qualquer desafio semanal - COMPROMETIMENTO MÉDIO PRAZO',
        baseXP: 50, // Mantido conforme diretriz
        category: 'CORE',
        frequency: 'UNLIMITED',
        multipliers: { perfect: 1.3 } // Reduzido para +30%
    },
    {
        id: 'complete-monthly-challenge',
        name: 'Desafio Mensal Completado',
        description: 'Completar qualquer desafio mensal',
        baseXP: 200,
        category: 'CORE',
        frequency: 'UNLIMITED',
        multipliers: { perfect: 2.0 } // +100% se fizer perfeitamente
    },
    {
        id: 'complete-special-challenge',
        name: 'Desafio Especial Completado',
        description: 'Completar desafio especial/sazonal',
        baseXP: 300,
        category: 'CORE',
        frequency: 'UNLIMITED'
    },
    {
        id: 'log-workout',
        name: 'Atividade Física Registrada',
        description: 'Registrar atividade física (1 XP a cada 5 minutos)',
        baseXP: 1, // Alinhado com diretriz: 1 XP/5min
        category: 'CORE',
        frequency: 'UNLIMITED',
        multipliers: { streak: 1.02 } // Reduzido
    },
    {
        id: 'log-nutrition',
        name: 'Hábito de Nutrição Registrado',
        description: 'Registrar hábito nutricional (ex: beber água, refeição saudável)',
        baseXP: 5, // Alinhado com diretriz: +5 XP/dia
        category: 'CORE',
        frequency: 'DAILY' // Limitado a uma vez por dia
    },
    {
        id: 'log-wellbeing',
        name: 'Hábito de Bem-Estar Registrado',
        description: 'Registrar atividade de bem-estar (ex: meditação, relaxamento)',
        baseXP: 5, // Alinhado com diretriz: +5 XP/dia
        category: 'CORE',
        frequency: 'DAILY' // Limitado a uma vez por dia
    },
    {
        id: 'log-sleep',
        name: 'Sono Registrado',
        description: 'Registrar noite de sono',
        baseXP: 8,
        category: 'CORE',
        frequency: 'DAILY',
        multipliers: { perfect: 1.5 } // +50% se dormir 7-9h
    },
    {
        id: 'book-appointment',
        name: 'Consulta Agendada',
        description: 'Agendar uma consulta médica',
        baseXP: 25,
        category: 'CORE',
        frequency: 'UNLIMITED'
    },
    {
        id: 'complete-appointment',
        name: 'Consulta Realizada',
        description: 'Comparecer a uma consulta agendada',
        baseXP: 40,
        category: 'CORE',
        frequency: 'UNLIMITED'
    },
    {
        id: 'update-medical-records',
        name: 'Prontuário Atualizado',
        description: 'Atualizar informações do prontuário',
        baseXP: 15,
        category: 'CORE',
        frequency: 'WEEKLY'
    },
    {
        id: 'set-long-term-goal',
        name: 'Meta de Longo Prazo Definida',
        description: 'Definir uma meta de longo prazo - COMPROMETIMENTO FORMAL',
        baseXP: 20, // Conforme diretriz
        category: 'CORE',
        frequency: 'UNLIMITED'
    }
];
// ==========================================
// CATEGORIA: CONSISTENCY (Consistência)
// ==========================================
exports.CONSISTENCY_ACTIONS = [
    {
        id: 'streak-7-days',
        name: 'Sequência de 7 Dias - BÔNUS',
        description: 'Manter atividade por 7 dias consecutivos - GAMIFICAÇÃO CLÁSSICA',
        baseXP: 100, // Mantido conforme diretriz
        category: 'CONSISTENCY',
        frequency: 'UNLIMITED'
    },
    {
        id: 'streak-14-days',
        name: 'Sequência de 14 Dias',
        description: 'Manter atividade por 14 dias consecutivos',
        baseXP: 250,
        category: 'CONSISTENCY',
        frequency: 'UNLIMITED'
    },
    {
        id: 'streak-30-days',
        name: 'Sequência de 30 Dias',
        description: 'Manter atividade por 30 dias consecutivos',
        baseXP: 500,
        category: 'CONSISTENCY',
        frequency: 'UNLIMITED'
    },
    {
        id: 'streak-60-days',
        name: 'Sequência de 60 Dias',
        description: 'Manter atividade por 60 dias consecutivos',
        baseXP: 1000,
        category: 'CONSISTENCY',
        frequency: 'UNLIMITED'
    },
    {
        id: 'streak-100-days',
        name: 'Sequência de 100 Dias',
        description: 'Manter atividade por 100 dias consecutivos',
        baseXP: 2000,
        category: 'CONSISTENCY',
        frequency: 'UNLIMITED'
    },
    {
        id: 'perfect-week',
        name: 'Semana Perfeita',
        description: 'Completar todos os desafios diários da semana',
        baseXP: 150,
        category: 'CONSISTENCY',
        frequency: 'WEEKLY'
    },
    {
        id: 'perfect-month',
        name: 'Mês Perfeito',
        description: 'Completar todos os desafios diários do mês',
        baseXP: 800,
        category: 'CONSISTENCY',
        frequency: 'MONTHLY'
    },
    {
        id: 'early-bird',
        name: 'Madrugador',
        description: 'Check-in antes das 8h da manhã',
        baseXP: 5,
        category: 'CONSISTENCY',
        frequency: 'DAILY'
    },
    {
        id: 'night-owl',
        name: 'Coruja Noturna',
        description: 'Completar desafio após 22h',
        baseXP: 5,
        category: 'CONSISTENCY',
        frequency: 'DAILY'
    }
];
// ==========================================
// CATEGORIA: SOCIAL (Interação Social)
// ==========================================
exports.SOCIAL_ACTIONS = [
    {
        id: 'invite-friend',
        name: 'Convite Enviado',
        description: 'Convidar um amigo para o app',
        baseXP: 20,
        category: 'SOCIAL',
        frequency: 'UNLIMITED'
    },
    {
        id: 'friend-joins',
        name: 'Amigo Cadastrado - CRESCIMENTO VIRAL',
        description: 'Um amigo se cadastrou usando seu convite',
        baseXP: 50, // Alinhado com diretriz
        category: 'SOCIAL',
        frequency: 'UNLIMITED'
    },
    {
        id: 'rate-professional',
        name: 'Parceiro Avaliado - DADOS VALIOSOS',
        description: 'Avaliar um parceiro após consulta - melhora qualidade da rede',
        baseXP: 15, // Alinhado com diretriz
        category: 'SOCIAL',
        frequency: 'UNLIMITED'
    },
    {
        id: 'write-review',
        name: 'Avaliação Detalhada',
        description: 'Escrever avaliação com comentário',
        baseXP: 15,
        category: 'SOCIAL',
        frequency: 'UNLIMITED'
    },
    {
        id: 'join-challenge-group',
        name: 'Grupo de Desafio',
        description: 'Participar de um desafio em grupo',
        baseXP: 30,
        category: 'SOCIAL',
        frequency: 'UNLIMITED'
    },
    {
        id: 'help-community',
        name: 'Ajuda na Comunidade',
        description: 'Responder pergunta de outro usuário',
        baseXP: 25,
        category: 'SOCIAL',
        frequency: 'UNLIMITED',
        conditions: { minLevel: 10 }
    },
    {
        id: 'share-achievement',
        name: 'Conquista Compartilhada',
        description: 'Compartilhar conquista nas redes sociais',
        baseXP: 15,
        category: 'SOCIAL',
        frequency: 'UNLIMITED'
    }
];
// ==========================================
// CATEGORIA: EXPLORATION (Exploração)
// ==========================================
exports.EXPLORATION_ACTIONS = [
    {
        id: 'try-new-challenge-type',
        name: 'Novo Tipo de Desafio',
        description: 'Experimentar um tipo de desafio pela primeira vez',
        baseXP: 50,
        category: 'EXPLORATION',
        frequency: 'ONE_TIME' // Por tipo de desafio
    },
    {
        id: 'complete-all-categories',
        name: 'Explorador Completo',
        description: 'Completar desafio em todas as categorias',
        baseXP: 300,
        category: 'EXPLORATION',
        frequency: 'ONE_TIME'
    },
    {
        id: 'try-telemedicine',
        name: 'Primeira Telemedicina',
        description: 'Fazer primeira consulta online',
        baseXP: 50,
        category: 'EXPLORATION',
        frequency: 'ONE_TIME'
    },
    {
        id: 'try-different-specialties',
        name: 'Diversificação',
        description: 'Consultar com 5 especialidades diferentes',
        baseXP: 200,
        category: 'EXPLORATION',
        frequency: 'ONE_TIME'
    },
    {
        id: 'complete-profile',
        name: 'Perfil Completo',
        description: 'Preencher 100% do perfil',
        baseXP: 75,
        category: 'EXPLORATION',
        frequency: 'ONE_TIME'
    },
    {
        id: 'enable-notifications',
        name: 'Notificações Ativadas',
        description: 'Ativar notificações push',
        baseXP: 10,
        category: 'EXPLORATION',
        frequency: 'ONE_TIME'
    },
    {
        id: 'try-premium-feature',
        name: 'Recurso Premium',
        description: 'Experimentar um recurso premium',
        baseXP: 30,
        category: 'EXPLORATION',
        frequency: 'ONE_TIME'
    }
];
// ==========================================
// CATEGORIA: MASTERY (Maestria)
// ==========================================
exports.MASTERY_ACTIONS = [
    {
        id: 'complete-10-challenges',
        name: 'Novato',
        description: 'Completar 10 desafios totais',
        baseXP: 150,
        category: 'MASTERY',
        frequency: 'ONE_TIME'
    },
    {
        id: 'complete-50-challenges',
        name: 'Experiente',
        description: 'Completar 50 desafios totais',
        baseXP: 500,
        category: 'MASTERY',
        frequency: 'ONE_TIME'
    },
    {
        id: 'complete-100-challenges',
        name: 'Veterano',
        description: 'Completar 100 desafios totais',
        baseXP: 1000,
        category: 'MASTERY',
        frequency: 'ONE_TIME'
    },
    {
        id: 'complete-250-challenges',
        name: 'Mestre',
        description: 'Completar 250 desafios totais',
        baseXP: 2500,
        category: 'MASTERY',
        frequency: 'ONE_TIME'
    },
    {
        id: 'complete-500-challenges',
        name: 'Lenda',
        description: 'Completar 500 desafios totais',
        baseXP: 5000,
        category: 'MASTERY',
        frequency: 'ONE_TIME'
    },
    {
        id: 'earn-10-badges',
        name: 'Colecionador',
        description: 'Conquistar 10 badges',
        baseXP: 200,
        category: 'MASTERY',
        frequency: 'ONE_TIME'
    },
    {
        id: 'earn-25-badges',
        name: 'Caçador de Badges',
        description: 'Conquistar 25 badges',
        baseXP: 1000,
        category: 'MASTERY',
        frequency: 'ONE_TIME'
    },
    {
        id: 'reach-level-10',
        name: 'Primeira Ascensão',
        description: 'Alcançar nível 10',
        baseXP: 250,
        category: 'MASTERY',
        frequency: 'ONE_TIME'
    },
    {
        id: 'reach-level-25',
        name: 'Ascensão Avançada',
        description: 'Alcançar nível 25',
        baseXP: 1500,
        category: 'MASTERY',
        frequency: 'ONE_TIME'
    },
    {
        id: 'reach-level-50',
        name: 'Maestria Suprema',
        description: 'Alcançar nível máximo (50)',
        baseXP: 10000,
        category: 'MASTERY',
        frequency: 'ONE_TIME'
    }
];
// ==========================================
// CATÁLOGO UNIFICADO
// ==========================================
exports.ALL_XP_ACTIONS = [
    ...exports.CORE_ACTIONS,
    ...exports.CONSISTENCY_ACTIONS,
    ...exports.SOCIAL_ACTIONS,
    ...exports.EXPLORATION_ACTIONS,
    ...exports.MASTERY_ACTIONS
];
/**
 * Índice rápido por ID
 */
exports.XP_ACTIONS_BY_ID = exports.ALL_XP_ACTIONS.reduce((acc, action) => {
    acc[action.id] = action;
    return acc;
}, {});
/**
 * CÁLCULO DE XP COM MULTIPLICADORES
 */
function calculateXP(actionId, context) {
    const action = exports.XP_ACTIONS_BY_ID[actionId];
    if (!action)
        return 0;
    let xp = action.baseXP;
    // Para ações baseadas em duração (ex: atividade física)
    if (context?.duration && actionId === 'log-workout') {
        const units = Math.floor(context.duration / 5); // A cada 5 minutos conforme diretriz
        xp = action.baseXP * units;
    }
    // Aplicar multiplicadores
    if (action.multipliers) {
        // Multiplicador de streak
        if (context?.streak && action.multipliers.streak) {
            const streakMultiplier = Math.pow(action.multipliers.streak, Math.min(context.streak, 30));
            xp *= streakMultiplier;
        }
        // Multiplicador de perfeição
        if (context?.isPerfect && action.multipliers.perfect) {
            xp *= action.multipliers.perfect;
        }
        // Multiplicador de combo
        if (context?.isCombo && action.multipliers.combo) {
            xp *= action.multipliers.combo;
        }
    }
    return Math.floor(xp);
}
/**
 * XP ESTIMADO POR PERÍODO
 * Para ajudar no balanceamento
 */
exports.ESTIMATED_XP_PER_PERIOD = {
    casual_user_daily: 50, // Usuário casual: 50 XP/dia
    active_user_daily: 150, // Usuário ativo: 150 XP/dia
    hardcore_user_daily: 300, // Usuário hardcore: 300 XP/dia
    casual_user_monthly: 1500, // ~50/dia x 30 dias
    active_user_monthly: 4500, // ~150/dia x 30 dias
    hardcore_user_monthly: 9000 // ~300/dia x 30 dias
};
/**
 * VALIDAÇÃO DE AÇÃO
 * Verifica se usuário pode realizar a ação
 */
function canPerformAction(action, userContext) {
    // Verificar nível mínimo
    if (action.conditions?.minLevel && userContext.level < action.conditions.minLevel) {
        return {
            can: false,
            reason: `Requer nível ${action.conditions.minLevel}`
        };
    }
    // Verificar streak mínimo
    if (action.conditions?.requiresStreak && userContext.streak < action.conditions.requiresStreak) {
        return {
            can: false,
            reason: `Requer ${action.conditions.requiresStreak} dias de sequência`
        };
    }
    // Verificar badge necessário
    if (action.conditions?.requiresBadge && !userContext.badges.includes(action.conditions.requiresBadge)) {
        return {
            can: false,
            reason: `Requer badge: ${action.conditions.requiresBadge}`
        };
    }
    // Verificar frequência diária
    if (action.frequency === 'DAILY' && userContext.actionsToday) {
        if (userContext.actionsToday[action.id] >= 1) {
            return {
                can: false,
                reason: 'Já realizado hoje'
            };
        }
    }
    return { can: true };
}
exports.default = exports.ALL_XP_ACTIONS;
//# sourceMappingURL=xp-economy.js.map