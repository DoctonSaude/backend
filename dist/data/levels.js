"use strict";
/**
 * SISTEMA DE NÍVEIS - JORNADA DO HERÓI
 * Curva logarítmica de progressão
 * 50 níveis com títulos épicos
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEVELS = void 0;
exports.getLevelByXP = getLevelByXP;
exports.getProgressToNextLevel = getProgressToNextLevel;
exports.getTierColor = getTierColor;
/**
 * Fórmula de progressão logarítmica
 * XP para próximo nível = baseXP * (level^1.5)
 * Isso cria uma curva onde:
 * - Níveis 1-10: Rápidos e gratificantes (dias)
 * - Níveis 11-25: Engajamento médio (semanas)
 * - Níveis 26-40: Dedicação real (meses)
 * - Níveis 41-50: Maestria épica (6+ meses)
 */
const BASE_XP = 50;
function calculateXPForLevel(level) {
    if (level === 1)
        return 0;
    return Math.floor(BASE_XP * Math.pow(level, 1.5));
}
function calculateTotalXP(level) {
    let total = 0;
    for (let i = 2; i <= level; i++) {
        total += calculateXPForLevel(i);
    }
    return total;
}
exports.LEVELS = [
    // TIER BRONZE (1-10) - Primeiros Passos
    {
        level: 1,
        title: 'Iniciante',
        xpRequired: 0,
        xpToNext: calculateXPForLevel(2),
        tier: 'BRONZE',
        rewards: { healthPoints: 100 }
    },
    {
        level: 2,
        title: 'Aprendiz',
        xpRequired: calculateTotalXP(2),
        xpToNext: calculateXPForLevel(3),
        tier: 'BRONZE',
        rewards: { healthPoints: 150 }
    },
    {
        level: 3,
        title: 'Explorador',
        xpRequired: calculateTotalXP(3),
        xpToNext: calculateXPForLevel(4),
        tier: 'BRONZE',
        rewards: { healthPoints: 200 }
    },
    {
        level: 4,
        title: 'Aventureiro',
        xpRequired: calculateTotalXP(4),
        xpToNext: calculateXPForLevel(5),
        tier: 'BRONZE',
        rewards: { healthPoints: 250 }
    },
    {
        level: 5,
        title: 'Praticante',
        xpRequired: calculateTotalXP(5),
        xpToNext: calculateXPForLevel(6),
        tier: 'BRONZE',
        rewards: { healthPoints: 300, badge: 'first-steps' }
    },
    {
        level: 6,
        title: 'Dedicado',
        xpRequired: calculateTotalXP(6),
        xpToNext: calculateXPForLevel(7),
        tier: 'BRONZE',
        rewards: { healthPoints: 350 }
    },
    {
        level: 7,
        title: 'Perseverante',
        xpRequired: calculateTotalXP(7),
        xpToNext: calculateXPForLevel(8),
        tier: 'BRONZE',
        rewards: { healthPoints: 400 }
    },
    {
        level: 8,
        title: 'Determinado',
        xpRequired: calculateTotalXP(8),
        xpToNext: calculateXPForLevel(9),
        tier: 'BRONZE',
        rewards: { healthPoints: 450 }
    },
    {
        level: 9,
        title: 'Comprometido',
        xpRequired: calculateTotalXP(9),
        xpToNext: calculateXPForLevel(10),
        tier: 'BRONZE',
        rewards: { healthPoints: 500 }
    },
    {
        level: 10,
        title: 'Guerreiro Bronze',
        xpRequired: calculateTotalXP(10),
        xpToNext: calculateXPForLevel(11),
        tier: 'BRONZE',
        rewards: { healthPoints: 600, badge: 'bronze-warrior', discount: 5 }
    },
    // TIER SILVER (11-20) - Engajamento Consistente
    {
        level: 11,
        title: 'Disciplinado',
        xpRequired: calculateTotalXP(11),
        xpToNext: calculateXPForLevel(12),
        tier: 'SILVER',
        rewards: { healthPoints: 700 }
    },
    {
        level: 12,
        title: 'Focado',
        xpRequired: calculateTotalXP(12),
        xpToNext: calculateXPForLevel(13),
        tier: 'SILVER',
        rewards: { healthPoints: 800 }
    },
    {
        level: 13,
        title: 'Resiliente',
        xpRequired: calculateTotalXP(13),
        xpToNext: calculateXPForLevel(14),
        tier: 'SILVER',
        rewards: { healthPoints: 900 }
    },
    {
        level: 14,
        title: 'Incansável',
        xpRequired: calculateTotalXP(14),
        xpToNext: calculateXPForLevel(15),
        tier: 'SILVER',
        rewards: { healthPoints: 1000 }
    },
    {
        level: 15,
        title: 'Atleta',
        xpRequired: calculateTotalXP(15),
        xpToNext: calculateXPForLevel(16),
        tier: 'SILVER',
        rewards: { healthPoints: 1200, badge: 'athlete', discount: 10 }
    },
    {
        level: 16,
        title: 'Vencedor',
        xpRequired: calculateTotalXP(16),
        xpToNext: calculateXPForLevel(17),
        tier: 'SILVER',
        rewards: { healthPoints: 1400 }
    },
    {
        level: 17,
        title: 'Conquistador',
        xpRequired: calculateTotalXP(17),
        xpToNext: calculateXPForLevel(18),
        tier: 'SILVER',
        rewards: { healthPoints: 1600 }
    },
    {
        level: 18,
        title: 'Campeão',
        xpRequired: calculateTotalXP(18),
        xpToNext: calculateXPForLevel(19),
        tier: 'SILVER',
        rewards: { healthPoints: 1800 }
    },
    {
        level: 19,
        title: 'Líder',
        xpRequired: calculateTotalXP(19),
        xpToNext: calculateXPForLevel(20),
        tier: 'SILVER',
        rewards: { healthPoints: 2000 }
    },
    {
        level: 20,
        title: 'Guerreiro Prata',
        xpRequired: calculateTotalXP(20),
        xpToNext: calculateXPForLevel(21),
        tier: 'SILVER',
        rewards: { healthPoints: 2500, badge: 'silver-warrior', discount: 15 }
    },
    // TIER GOLD (21-30) - Dedicação Real
    {
        level: 21,
        title: 'Mestre Iniciante',
        xpRequired: calculateTotalXP(21),
        xpToNext: calculateXPForLevel(22),
        tier: 'GOLD',
        rewards: { healthPoints: 3000 }
    },
    {
        level: 22,
        title: 'Guardião',
        xpRequired: calculateTotalXP(22),
        xpToNext: calculateXPForLevel(23),
        tier: 'GOLD',
        rewards: { healthPoints: 3500 }
    },
    {
        level: 23,
        title: 'Protetor',
        xpRequired: calculateTotalXP(23),
        xpToNext: calculateXPForLevel(24),
        tier: 'GOLD',
        rewards: { healthPoints: 4000 }
    },
    {
        level: 24,
        title: 'Defensor',
        xpRequired: calculateTotalXP(24),
        xpToNext: calculateXPForLevel(25),
        tier: 'GOLD',
        rewards: { healthPoints: 4500 }
    },
    {
        level: 25,
        title: 'Titã',
        xpRequired: calculateTotalXP(25),
        xpToNext: calculateXPForLevel(26),
        tier: 'GOLD',
        rewards: { healthPoints: 5000, badge: 'titan', discount: 20 }
    },
    {
        level: 26,
        title: 'Herói',
        xpRequired: calculateTotalXP(26),
        xpToNext: calculateXPForLevel(27),
        tier: 'GOLD',
        rewards: { healthPoints: 5500 }
    },
    {
        level: 27,
        title: 'Paladino',
        xpRequired: calculateTotalXP(27),
        xpToNext: calculateXPForLevel(28),
        tier: 'GOLD',
        rewards: { healthPoints: 6000 }
    },
    {
        level: 28,
        title: 'Cavaleiro',
        xpRequired: calculateTotalXP(28),
        xpToNext: calculateXPForLevel(29),
        tier: 'GOLD',
        rewards: { healthPoints: 6500 }
    },
    {
        level: 29,
        title: 'Cruzado',
        xpRequired: calculateTotalXP(29),
        xpToNext: calculateXPForLevel(30),
        tier: 'GOLD',
        rewards: { healthPoints: 7000 }
    },
    {
        level: 30,
        title: 'Guerreiro Ouro',
        xpRequired: calculateTotalXP(30),
        xpToNext: calculateXPForLevel(31),
        tier: 'GOLD',
        rewards: { healthPoints: 8000, badge: 'gold-warrior', discount: 25, specialReward: 'check-up-gratis' }
    },
    // TIER PLATINUM (31-40) - Maestria Avançada
    {
        level: 31,
        title: 'Mestre Sênior',
        xpRequired: calculateTotalXP(31),
        xpToNext: calculateXPForLevel(32),
        tier: 'PLATINUM',
        rewards: { healthPoints: 9000 }
    },
    {
        level: 32,
        title: 'Sábio',
        xpRequired: calculateTotalXP(32),
        xpToNext: calculateXPForLevel(33),
        tier: 'PLATINUM',
        rewards: { healthPoints: 10000 }
    },
    {
        level: 33,
        title: 'Oráculo',
        xpRequired: calculateTotalXP(33),
        xpToNext: calculateXPForLevel(34),
        tier: 'PLATINUM',
        rewards: { healthPoints: 11000 }
    },
    {
        level: 34,
        title: 'Visionário',
        xpRequired: calculateTotalXP(34),
        xpToNext: calculateXPForLevel(35),
        tier: 'PLATINUM',
        rewards: { healthPoints: 12000 }
    },
    {
        level: 35,
        title: 'Imperador',
        xpRequired: calculateTotalXP(35),
        xpToNext: calculateXPForLevel(36),
        tier: 'PLATINUM',
        rewards: { healthPoints: 13000, badge: 'emperor', discount: 30 }
    },
    {
        level: 36,
        title: 'Soberano',
        xpRequired: calculateTotalXP(36),
        xpToNext: calculateXPForLevel(37),
        tier: 'PLATINUM',
        rewards: { healthPoints: 14000 }
    },
    {
        level: 37,
        title: 'Monarca',
        xpRequired: calculateTotalXP(37),
        xpToNext: calculateXPForLevel(38),
        tier: 'PLATINUM',
        rewards: { healthPoints: 15000 }
    },
    {
        level: 38,
        title: 'Guardião Supremo',
        xpRequired: calculateTotalXP(38),
        xpToNext: calculateXPForLevel(39),
        tier: 'PLATINUM',
        rewards: { healthPoints: 16000 }
    },
    {
        level: 39,
        title: 'Protetor Ancestral',
        xpRequired: calculateTotalXP(39),
        xpToNext: calculateXPForLevel(40),
        tier: 'PLATINUM',
        rewards: { healthPoints: 17000 }
    },
    {
        level: 40,
        title: 'Guerreiro Platina',
        xpRequired: calculateTotalXP(40),
        xpToNext: calculateXPForLevel(41),
        tier: 'PLATINUM',
        rewards: { healthPoints: 20000, badge: 'platinum-warrior', discount: 35, specialReward: 'consulta-vip-gratis' }
    },
    // TIER DIAMOND (41-45) - Elite Absoluta
    {
        level: 41,
        title: 'Imortal',
        xpRequired: calculateTotalXP(41),
        xpToNext: calculateXPForLevel(42),
        tier: 'DIAMOND',
        rewards: { healthPoints: 22000 }
    },
    {
        level: 42,
        title: 'Divino',
        xpRequired: calculateTotalXP(42),
        xpToNext: calculateXPForLevel(43),
        tier: 'DIAMOND',
        rewards: { healthPoints: 24000 }
    },
    {
        level: 43,
        title: 'Celestial',
        xpRequired: calculateTotalXP(43),
        xpToNext: calculateXPForLevel(44),
        tier: 'DIAMOND',
        rewards: { healthPoints: 26000 }
    },
    {
        level: 44,
        title: 'Transcendente',
        xpRequired: calculateTotalXP(44),
        xpToNext: calculateXPForLevel(45),
        tier: 'DIAMOND',
        rewards: { healthPoints: 28000 }
    },
    {
        level: 45,
        title: 'Guerreiro Diamante',
        xpRequired: calculateTotalXP(45),
        xpToNext: calculateXPForLevel(46),
        tier: 'DIAMOND',
        rewards: { healthPoints: 30000, badge: 'diamond-warrior', discount: 40, specialReward: 'plano-premium-1-mes' }
    },
    // TIER LEGEND (46-50) - Lendas Vivas
    {
        level: 46,
        title: 'Lenda',
        xpRequired: calculateTotalXP(46),
        xpToNext: calculateXPForLevel(47),
        tier: 'LEGEND',
        rewards: { healthPoints: 35000 }
    },
    {
        level: 47,
        title: 'Mito',
        xpRequired: calculateTotalXP(47),
        xpToNext: calculateXPForLevel(48),
        tier: 'LEGEND',
        rewards: { healthPoints: 40000 }
    },
    {
        level: 48,
        title: 'Épico',
        xpRequired: calculateTotalXP(48),
        xpToNext: calculateXPForLevel(49),
        tier: 'LEGEND',
        rewards: { healthPoints: 45000 }
    },
    {
        level: 49,
        title: 'Semideus',
        xpRequired: calculateTotalXP(49),
        xpToNext: calculateXPForLevel(50),
        tier: 'LEGEND',
        rewards: { healthPoints: 50000 }
    },
    {
        level: 50,
        title: 'Maestria Absoluta',
        xpRequired: calculateTotalXP(50),
        xpToNext: 0, // Nível máximo
        tier: 'LEGEND',
        rewards: {
            healthPoints: 100000,
            badge: 'absolute-mastery',
            discount: 50,
            specialReward: 'acesso-vitalicio-premium'
        }
    }
];
/**
 * Utilitários para trabalhar com níveis
 */
function getLevelByXP(xp) {
    for (let i = exports.LEVELS.length - 1; i >= 0; i--) {
        if (xp >= exports.LEVELS[i].xpRequired) {
            return exports.LEVELS[i];
        }
    }
    return exports.LEVELS[0];
}
function getProgressToNextLevel(xp) {
    const currentLevel = getLevelByXP(xp);
    const xpInCurrentLevel = xp - currentLevel.xpRequired;
    const xpNeededForNext = currentLevel.xpToNext;
    return {
        current: xpInCurrentLevel,
        required: xpNeededForNext,
        percentage: xpNeededForNext > 0 ? Math.floor((xpInCurrentLevel / xpNeededForNext) * 100) : 100
    };
}
function getTierColor(tier) {
    const colors = {
        BRONZE: '#CD7F32',
        SILVER: '#C0C0C0',
        GOLD: '#FFD700',
        PLATINUM: '#E5E4E2',
        DIAMOND: '#B9F2FF',
        LEGEND: '#9F00FF'
    };
    return colors[tier];
}
exports.default = exports.LEVELS;
//# sourceMappingURL=levels.js.map