/**
 * SISTEMA DE BADGES CATEGORIZADO
 * Organizado em 4 categorias principais da Jornada do Herói
 */

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';
  category: 'CONSISTENCY' | 'EXPLORATION' | 'SOCIAL' | 'MASTERY';
  isSecret: boolean;
  requirement: string;
  xpReward: number;
  order: number; // Para exibição
}

// ==========================================
// CATEGORIA: CONSISTENCY (Consistência)
// "O caminho do monge - disciplina diária"
// ==========================================
export const CONSISTENCY_BADGES: Badge[] = [
  {
    id: 'first-steps',
    name: 'Primeiros Passos',
    description: 'Complete seu primeiro desafio',
    icon: '👣',
    rarity: 'COMMON',
    category: 'CONSISTENCY',
    isSecret: false,
    requirement: 'Completar 1 desafio',
    xpReward: 50,
    order: 1
  },
  {
    id: 'week-warrior',
    name: 'Guerreiro Semanal',
    description: 'Mantenha uma sequência de 7 dias',
    icon: '📅',
    rarity: 'COMMON',
    category: 'CONSISTENCY',
    isSecret: false,
    requirement: 'Streak de 7 dias',
    xpReward: 100,
    order: 2
  },
  {
    id: 'fortnight-fighter',
    name: 'Combatente Quinzenal',
    description: 'Mantenha uma sequência de 14 dias',
    icon: '⚔️',
    rarity: 'RARE',
    category: 'CONSISTENCY',
    isSecret: false,
    requirement: 'Streak de 14 dias',
    xpReward: 250,
    order: 3
  },
  {
    id: 'month-master',
    name: 'Mestre do Mês',
    description: 'Mantenha uma sequência de 30 dias',
    icon: '🗓️',
    rarity: 'EPIC',
    category: 'CONSISTENCY',
    isSecret: false,
    requirement: 'Streak de 30 dias',
    xpReward: 500,
    order: 4
  },
  {
    id: 'eternal-flame',
    name: 'Chama Eterna',
    description: 'Mantenha uma sequência de 100 dias',
    icon: '🔥',
    rarity: 'LEGENDARY',
    category: 'CONSISTENCY',
    isSecret: false,
    requirement: 'Streak de 100 dias',
    xpReward: 2000,
    order: 5
  },
  {
    id: 'immortal-spirit',
    name: 'Espírito Imortal',
    description: 'Mantenha uma sequência de 365 dias',
    icon: '♾️',
    rarity: 'MYTHIC',
    category: 'CONSISTENCY',
    isSecret: false,
    requirement: 'Streak de 365 dias',
    xpReward: 10000,
    order: 6
  },
  {
    id: 'perfect-week',
    name: 'Semana Perfeita',
    description: 'Complete todos os desafios diários da semana',
    icon: '💯',
    rarity: 'RARE',
    category: 'CONSISTENCY',
    isSecret: false,
    requirement: '7/7 desafios diários em uma semana',
    xpReward: 150,
    order: 7
  },
  {
    id: 'early-bird',
    name: 'Pássaro Madrugador',
    description: 'Faça check-in antes das 6h por 7 dias seguidos',
    icon: '🌅',
    rarity: 'RARE',
    category: 'CONSISTENCY',
    isSecret: true,
    requirement: 'Check-in antes das 6h - 7 dias consecutivos',
    xpReward: 200,
    order: 8
  },
  {
    id: 'night-owl',
    name: 'Coruja Noturna',
    description: 'Complete desafios após 22h por 7 dias seguidos',
    icon: '🦉',
    rarity: 'RARE',
    category: 'CONSISTENCY',
    isSecret: true,
    requirement: 'Desafios após 22h - 7 dias consecutivos',
    xpReward: 200,
    order: 9
  },
  {
    id: 'weekend-warrior',
    name: 'Guerreiro de Fim de Semana',
    description: 'Mantenha sua sequência em 4 fins de semana consecutivos',
    icon: '🎉',
    rarity: 'EPIC',
    category: 'CONSISTENCY',
    isSecret: true,
    requirement: '4 fins de semana seguidos ativos',
    xpReward: 400,
    order: 10
  }
];

// ==========================================
// CATEGORIA: EXPLORATION (Exploração)
// "O caminho do explorador - descoberta"
// ==========================================
export const EXPLORATION_BADGES: Badge[] = [
  {
    id: 'curious-mind',
    name: 'Mente Curiosa',
    description: 'Complete seu primeiro desafio de cada tipo',
    icon: '🔍',
    rarity: 'COMMON',
    category: 'EXPLORATION',
    isSecret: false,
    requirement: '1 desafio de cada tipo (diário, semanal, mensal)',
    xpReward: 100,
    order: 11
  },
  {
    id: 'category-explorer',
    name: 'Explorador de Categorias',
    description: 'Complete desafios em todas as 4 categorias',
    icon: '🧭',
    rarity: 'RARE',
    category: 'EXPLORATION',
    isSecret: false,
    requirement: 'Desafio em cada categoria (Saúde, Exercício, Nutrição, Bem-estar)',
    xpReward: 300,
    order: 12
  },
  {
    id: 'versatile-hero',
    name: 'Herói Versátil',
    description: 'Complete 5 desafios em cada categoria',
    icon: '🎭',
    rarity: 'EPIC',
    category: 'EXPLORATION',
    isSecret: false,
    requirement: '5 desafios em cada uma das 4 categorias',
    xpReward: 800,
    order: 13
  },
  {
    id: 'telemedicine-pioneer',
    name: 'Pioneiro da Telemedicina',
    description: 'Faça sua primeira consulta online',
    icon: '💻',
    rarity: 'COMMON',
    category: 'EXPLORATION',
    isSecret: false,
    requirement: '1 consulta de telemedicina',
    xpReward: 50,
    order: 14
  },
  {
    id: 'specialty-collector',
    name: 'Colecionador de Especialidades',
    description: 'Consulte com 5 especialidades médicas diferentes',
    icon: '🏥',
    rarity: 'RARE',
    category: 'EXPLORATION',
    isSecret: false,
    requirement: 'Consultas com 5 especialidades diferentes',
    xpReward: 200,
    order: 15
  },
  {
    id: 'complete-profile',
    name: 'Perfil Completo',
    description: 'Preencha 100% do seu perfil de saúde',
    icon: '📋',
    rarity: 'COMMON',
    category: 'EXPLORATION',
    isSecret: false,
    requirement: 'Perfil 100% preenchido',
    xpReward: 75,
    order: 16
  },
  {
    id: 'experimentalist',
    name: 'Experimentalista',
    description: 'Teste todos os tipos de desafios disponíveis',
    icon: '🧪',
    rarity: 'EPIC',
    category: 'EXPLORATION',
    isSecret: false,
    requirement: 'Completar pelo menos 1 desafio de cada tipo disponível',
    xpReward: 500,
    order: 17
  },
  {
    id: 'hidden-gem-finder',
    name: 'Descobridor de Joias',
    description: 'Encontre e complete 3 desafios especiais',
    icon: '💎',
    rarity: 'LEGENDARY',
    category: 'EXPLORATION',
    isSecret: true,
    requirement: '3 desafios especiais completados',
    xpReward: 1500,
    order: 18
  }
];

// ==========================================
// CATEGORIA: SOCIAL (Interação Social)
// "O caminho do líder - influência"
// ==========================================
export const SOCIAL_BADGES: Badge[] = [
  {
    id: 'friendly-face',
    name: 'Rosto Amigável',
    description: 'Convide seu primeiro amigo',
    icon: '👋',
    rarity: 'COMMON',
    category: 'SOCIAL',
    isSecret: false,
    requirement: 'Enviar 1 convite',
    xpReward: 50,
    order: 19
  },
  {
    id: 'recruiter',
    name: 'Recrutador',
    description: 'Traga 3 amigos para a plataforma',
    icon: '🤝',
    rarity: 'RARE',
    category: 'SOCIAL',
    isSecret: false,
    requirement: '3 amigos cadastrados via convite',
    xpReward: 300,
    order: 20
  },
  {
    id: 'team-leader',
    name: 'Líder de Equipe',
    description: 'Traga 10 amigos para a plataforma',
    icon: '👥',
    rarity: 'EPIC',
    category: 'SOCIAL',
    isSecret: false,
    requirement: '10 amigos cadastrados via convite',
    xpReward: 1000,
    order: 21
  },
  {
    id: 'community-builder',
    name: 'Construtor de Comunidade',
    description: 'Traga 25 pessoas para a plataforma',
    icon: '🏛️',
    rarity: 'LEGENDARY',
    category: 'SOCIAL',
    isSecret: false,
    requirement: '25 amigos cadastrados via convite',
    xpReward: 3000,
    order: 22
  },
  {
    id: 'helpful-hand',
    name: 'Mão Amiga',
    description: 'Avalie 5 profissionais de saúde',
    icon: '⭐',
    rarity: 'COMMON',
    category: 'SOCIAL',
    isSecret: false,
    requirement: '5 avaliações realizadas',
    xpReward: 100,
    order: 23
  },
  {
    id: 'critic',
    name: 'Crítico Construtivo',
    description: 'Escreva 10 avaliações detalhadas com comentários',
    icon: '✍️',
    rarity: 'RARE',
    category: 'SOCIAL',
    isSecret: false,
    requirement: '10 avaliações com comentário',
    xpReward: 250,
    order: 24
  },
  {
    id: 'influencer',
    name: 'Influenciador',
    description: 'Compartilhe 10 conquistas nas redes sociais',
    icon: '📢',
    rarity: 'EPIC',
    category: 'SOCIAL',
    isSecret: false,
    requirement: '10 compartilhamentos sociais',
    xpReward: 500,
    order: 25
  },
  {
    id: 'mentor',
    name: 'Mentor',
    description: 'Ajude outros usuários na comunidade 20 vezes',
    icon: '🎓',
    rarity: 'LEGENDARY',
    category: 'SOCIAL',
    isSecret: false,
    requirement: '20 respostas na comunidade (requer nível 15)',
    xpReward: 2000,
    order: 26
  }
];

// ==========================================
// CATEGORIA: MASTERY (Maestria)
// "O caminho do mestre - excelência"
// ==========================================
export const MASTERY_BADGES: Badge[] = [
  {
    id: 'apprentice',
    name: 'Aprendiz',
    description: 'Complete 10 desafios totais',
    icon: '🎯',
    rarity: 'COMMON',
    category: 'MASTERY',
    isSecret: false,
    requirement: '10 desafios completados',
    xpReward: 150,
    order: 27
  },
  {
    id: 'journeyman',
    name: 'Jornaleiro',
    description: 'Complete 50 desafios totais',
    icon: '⚡',
    rarity: 'RARE',
    category: 'MASTERY',
    isSecret: false,
    requirement: '50 desafios completados',
    xpReward: 500,
    order: 28
  },
  {
    id: 'expert',
    name: 'Especialista',
    description: 'Complete 100 desafios totais',
    icon: '💪',
    rarity: 'EPIC',
    category: 'MASTERY',
    isSecret: false,
    requirement: '100 desafios completados',
    xpReward: 1000,
    order: 29
  },
  {
    id: 'master',
    name: 'Mestre',
    description: 'Complete 250 desafios totais',
    icon: '🥋',
    rarity: 'LEGENDARY',
    category: 'MASTERY',
    isSecret: false,
    requirement: '250 desafios completados',
    xpReward: 2500,
    order: 30
  },
  {
    id: 'grandmaster',
    name: 'Grão-Mestre',
    description: 'Complete 500 desafios totais',
    icon: '👑',
    rarity: 'MYTHIC',
    category: 'MASTERY',
    isSecret: false,
    requirement: '500 desafios completados',
    xpReward: 5000,
    order: 31
  },
  {
    id: 'bronze-warrior',
    name: 'Guerreiro Bronze',
    description: 'Alcance o nível 10',
    icon: '🥉',
    rarity: 'RARE',
    category: 'MASTERY',
    isSecret: false,
    requirement: 'Nível 10',
    xpReward: 250,
    order: 32
  },
  {
    id: 'silver-warrior',
    name: 'Guerreiro Prata',
    description: 'Alcance o nível 20',
    icon: '🥈',
    rarity: 'EPIC',
    category: 'MASTERY',
    isSecret: false,
    requirement: 'Nível 20',
    xpReward: 1000,
    order: 33
  },
  {
    id: 'gold-warrior',
    name: 'Guerreiro Ouro',
    description: 'Alcance o nível 30',
    icon: '🥇',
    rarity: 'LEGENDARY',
    category: 'MASTERY',
    isSecret: false,
    requirement: 'Nível 30',
    xpReward: 3000,
    order: 34
  },
  {
    id: 'platinum-warrior',
    name: 'Guerreiro Platina',
    description: 'Alcance o nível 40',
    icon: '💠',
    rarity: 'MYTHIC',
    category: 'MASTERY',
    isSecret: false,
    requirement: 'Nível 40',
    xpReward: 8000,
    order: 35
  },
  {
    id: 'diamond-warrior',
    name: 'Guerreiro Diamante',
    description: 'Alcance o nível 45',
    icon: '💎',
    rarity: 'MYTHIC',
    category: 'MASTERY',
    isSecret: false,
    requirement: 'Nível 45',
    xpReward: 15000,
    order: 36
  },
  {
    id: 'absolute-mastery',
    name: 'Maestria Absoluta',
    description: 'Alcance o nível máximo 50',
    icon: '🌟',
    rarity: 'MYTHIC',
    category: 'MASTERY',
    isSecret: false,
    requirement: 'Nível 50',
    xpReward: 25000,
    order: 37
  },
  {
    id: 'badge-collector',
    name: 'Colecionador de Badges',
    description: 'Conquiste 10 badges',
    icon: '🏅',
    rarity: 'RARE',
    category: 'MASTERY',
    isSecret: false,
    requirement: '10 badges conquistados',
    xpReward: 300,
    order: 38
  },
  {
    id: 'badge-hunter',
    name: 'Caçador de Badges',
    description: 'Conquiste 25 badges',
    icon: '🎖️',
    rarity: 'LEGENDARY',
    category: 'MASTERY',
    isSecret: false,
    requirement: '25 badges conquistados',
    xpReward: 2000,
    order: 39
  },
  {
    id: 'perfectionist',
    name: 'Perfeccionista',
    description: 'Complete 20 desafios com perfeição (100%)',
    icon: '✨',
    rarity: 'EPIC',
    category: 'MASTERY',
    isSecret: false,
    requirement: '20 desafios com 100% de progresso',
    xpReward: 1500,
    order: 40
  },
  {
    id: 'secret-seeker',
    name: 'Caçador de Segredos',
    description: 'Desbloqueie todos os badges secretos',
    icon: '🔐',
    rarity: 'MYTHIC',
    category: 'MASTERY',
    isSecret: true,
    requirement: 'Todos os badges secretos desbloqueados',
    xpReward: 10000,
    order: 41
  }
];

// ==========================================
// CATÁLOGO COMPLETO
// ==========================================
export const ALL_BADGES: Badge[] = [
  ...CONSISTENCY_BADGES,
  ...EXPLORATION_BADGES,
  ...SOCIAL_BADGES,
  ...MASTERY_BADGES
];

/**
 * Índice por ID
 */
export const BADGES_BY_ID: Record<string, Badge> = ALL_BADGES.reduce(
  (acc, badge) => {
    acc[badge.id] = badge;
    return acc;
  },
  {} as Record<string, Badge>
);

/**
 * Badges por categoria
 */
export const BADGES_BY_CATEGORY = {
  CONSISTENCY: CONSISTENCY_BADGES,
  EXPLORATION: EXPLORATION_BADGES,
  SOCIAL: SOCIAL_BADGES,
  MASTERY: MASTERY_BADGES
};

/**
 * Badges por raridade
 */
export const BADGES_BY_RARITY = {
  COMMON: ALL_BADGES.filter(b => b.rarity === 'COMMON'),
  RARE: ALL_BADGES.filter(b => b.rarity === 'RARE'),
  EPIC: ALL_BADGES.filter(b => b.rarity === 'EPIC'),
  LEGENDARY: ALL_BADGES.filter(b => b.rarity === 'LEGENDARY'),
  MYTHIC: ALL_BADGES.filter(b => b.rarity === 'MYTHIC')
};

/**
 * Badges secretos
 */
export const SECRET_BADGES = ALL_BADGES.filter(b => b.isSecret);

/**
 * Cores por raridade
 */
export const RARITY_COLORS = {
  COMMON: '#9CA3AF',    // Cinza
  RARE: '#3B82F6',      // Azul
  EPIC: '#A855F7',      // Roxo
  LEGENDARY: '#F59E0B',  // Laranja/Ouro
  MYTHIC: '#EF4444'      // Vermelho/Místico
};

export default ALL_BADGES;
