/**
 * Configurações Centralizadas - PedeMed Engine
 * Baseado no documento de decisões técnicas
 */
export const PEDOMED_CONFIG = {
    // Geolocalização
    GEOLOCATION: {
        DEFAULT_RADIUS_KM: 5,
        MAX_RADIUS_KM: 20,
        EARTH_RADIUS_KM: 6371, // Raio da Terra para Haversine
        PRECISION_DECIMALS: 4
    },
    // Configuração de Waves
    WAVES: {
        WAVE1: {
            PHARMACY_COUNT: 5,
            TIMEOUT_SECONDS: 30,
            RADIUS_KM: 5
        },
        WAVE2: {
            ADDITIONAL_PHARMACIES: 5,
            TIMEOUT_SECONDS: 60, // adicional ao total
            ADDITIONAL_RADIUS_KM: 5, // raio total: 10km
            TOTAL_TIMEOUT_SECONDS: 90
        },
        WAVE3: {
            ALL_ELIGIBLE: true,
            TIMEOUT_SECONDS: 90, // adicional ao total
            MAX_RADIUS_KM: 20,
            TOTAL_TIMEOUT_SECONDS: 180
        }
    },
    // SLAs e Timeouts
    SLAS: {
        PHARMACY_RESPONSE_MAX_SECONDS: 60,
        QUOTE_EXPIRATION_HOURS: 3,
        CLEANUP_AFTER_EXPIRATION_HOURS: 24
    },
    // Limites e Restrições
    LIMITS: {
        MAX_QUOTES_PER_HOUR_PER_PATIENT: 5,
        MAX_ITEMS_PER_QUOTE: 10,
        MAX_PHARMACIES_PER_WAVE: 5,
        MIN_QUOTE_VALUE: 1.0, // R$ 1,00
        MAX_QUOTE_VALUE: 10000.0 // R$ 10.000,00
    },
    // Critérios de Elegibilidade
    ELIGIBILITY: {
        MIN_PHARMACY_SCORE: 0.5, // Quando F4 for implementado
        REQUIRED_STOCK_RATIO: 1.0, // 100% do solicitado
        MAX_DISTANCE_KM: 20,
        ACTIVE_STATUS: 'ACTIVE'
    },
    // Comissões (padrão - podem ser sobrescritas pelo admin)
    COMMISSIONS: {
        PHARMACY: 10.0, // %
        CONSULTATION: 15.0,
        EXAM: 12.0,
        PROCEDURE: 8.0,
        DEFAULT: 10.0
    } as Record<string, number>,
    // Notificações
    NOTIFICATIONS: {
        MAX_PER_USER: 50,
        EVENTS: {
            NEW_QUOTE: 'NEW_QUOTE',
            QUOTE_UPDATE: 'QUOTE_UPDATE',
            NEW_RESPONSE: 'NEW_RESPONSE',
            QUOTE_EXPIRED: 'QUOTE_EXPIRED'
        },
        SOCKET: {
            PING_INTERVAL: 25000,
            PING_TIMEOUT: 5000
        }
    },
    // Fila/Jobs (BullMQ)
    QUEUE: {
        NAME: 'pharmacy-quotes',
        CONCURRENCY: 10,
        MAX_RETRIES: 3,
        RETRY_BACKOFF: {
            type: 'exponential',
            delay: 2000
        },
        REMOVE_ON_COMPLETE: 100,
        REMOVE_ON_FAIL: 50
    },
    // Validações de Negócio
    VALIDATION: {
        PRODUCT_NAME: {
            MIN_LENGTH: 2,
            MAX_LENGTH: 100,
            ALLOWED_CHARS: /^[a-zA-Z0-9\s\-áàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ.()]+$/
        },
        QUANTITY: {
            MIN: 1,
            MAX: 100,
            MUST_BE_INTEGER: true
        },
        NOTES: {
            MAX_LENGTH: 500
        }
    },
    // Performance Score System (Fase 4)
    PERFORMANCE_SCORE: {
        // Pesos das métricas (soma = 1.0)
        WEIGHTS: {
            RESPONSE_TIME: 0.25, // 25% - tempo médio de resposta
            RESPONSE_RATE: 0.25, // 25% - taxa de resposta
            PRICE_COMPETITIVENESS: 0.20, // 20% - competitividade de preço
            DISTANCE: 0.15, // 15% - proximidade ao paciente
            PLAN_TYPE: 0.15, // 15% - tipo de plano (free/pro/premium)
        },
        // Limites e thresholds
        MIN_SCORE: 0.1,
        MAX_SCORE: 1.0,
        DEFAULT_NEW_PHARMACY_SCORE: 0.5,
        // Métricas de tempo
        RESPONSE_TIME_TARGET_MINUTES: 15, // ideal: 15min
        RESPONSE_TIME_MAX_MINUTES: 60, // aceitável: 60min
        // Métricas de taxa de resposta
        RESPONSE_RATE_MINIMUM: 0.3, // 30% mínimo
        RESPONSE_RATE_EXCELLENT: 0.9, // 90% excelente
        // Métricas de preço
        PRICE_VS_MARKET_AVERAGE: 1.0, // 1.0 = média do mercado
        PRICE_COMPETITIVE_THRESHOLD: 0.9, // 10% abaixo = competitivo
        PRICE_EXPENSIVE_THRESHOLD: 1.2, // 20% acima = caro
        // Tipos de plano
        PLAN_SCORES: {
            BASIC: 0.3, // Plano free/basic
            PRO: 0.7, // Plano pro
            PREMIUM: 1.0, // Plano premium
        },
        // Atualização de snapshots
        SNAPSHOT_INTERVAL_HOURS: 24, // Snapshot diário
        SCORE_RECALCULATION_MINUTES: 60, // Recalcular a cada hora
        SCORE_DECAY_FACTOR_PER_WEEK: 0.95, // Reduzir score antigo em 5% por semana
        MIN_QUOTES_FOR_SCORE: 5, // Mínimo de cotações para score válido
    },
    // Drug Matching Engine (Fase 5)
    DRUG_MATCHING: {
        // Cache settings
        CACHE: {
            TTL_MINUTES: 60, // Cache por 1 hora
            MAX_RESULTS: 100, // Máximo de resultados em cache
            CLEANUP_INTERVAL_MINUTES: 30, // Limpar cache expirado a cada 30min
        },
        // Fuzzy matching thresholds
        FUZZY_MATCHING: {
            MIN_CONFIDENCE: 0.3, // Confiança mínima para fuzzy match
            EXACT_MATCH_CONFIDENCE: 1.0, // Match exato
            NORMALIZED_MATCH_CONFIDENCE: 0.9, // Match normalizado
            SYNONYM_MATCH_CONFIDENCE: 0.8, // Match por sinônimo
            MAX_EDIT_DISTANCE: 2, // Distância máxima de Levenshtein
            MIN_TRIGRAM_SIMILARITY: 0.4, // Similaridade mínima de trigram
        },
        // Search limits
        SEARCH: {
            MAX_RESULTS: 20, // Máximo de resultados retornados
            MAX_QUERY_LENGTH: 100, // Tamanho máximo da query
            MIN_QUERY_LENGTH: 2, // Tamanho mínimo da query
            TIMEOUT_MS: 5000, // Timeout da busca
        },
        // Alias types and priorities
        ALIAS_TYPES: {
            BRAND: { priority: 9, confidence: 0.95 },
            GENERIC: { priority: 8, confidence: 0.90 },
            COMMON: { priority: 7, confidence: 0.85 },
            ABBREVIATION: { priority: 6, confidence: 0.80 },
            MISSPELLING: { priority: 5, confidence: 0.70 },
        },
        // Learning system
        LEARNING: {
            ENABLED: true,
            MIN_OCCURRENCES_FOR_ALIAS: 3, // Mínimo de ocorrências para criar alias
            SUCCESS_RATE_THRESHOLD: 0.8, // Taxa de sucesso para manter alias
            AUTO_CREATE_MISSPELLINGS: true, // Criar automaticamente erros comuns
            ANALYSIS_INTERVAL_HOURS: 24, // Análise para novos aliases
        },
        // Performance monitoring
        MONITORING: {
            LOG_ALL_SEARCHES: false, // Log todas as buscas (development)
            LOG_FAILED_SEARCHES: true, // Log buscas falhadas
            TRACK_RESPONSE_TIMES: true, // Monitorar tempo de resposta
            MAX_LOGS_RETENTION_DAYS: 30, // Retenção de logs
        },
        // Normalization rules
        NORMALIZATION: {
            REMOVE_DIACRITICS: true, // Remover acentos
            LOWERCASE: true, // Converter para minúsculas
            REMOVE_SPECIAL_CHARS: true, // Remover caracteres especiais
            NORMALIZE_NUMBERS: true, // Normalizar números (ex: "5mg" -> "5 mg")
            EXPAND_ABBREVIATIONS: true, // Expandir abreviações comuns
        },
    },
    // OCR e Cotação por Foto (Fase 6)
    OCR: {
        // Configurações gerais
        ENABLED: true,
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        ALLOWED_FORMATS: ['image/jpeg', 'image/png', 'image/webp'],
        MIN_CONFIDENCE_THRESHOLD: 0.6,
        PROCESSING_TIMEOUT_MS: 30000, // 30 segundos
        // Controles de qualidade
        QUALITY_CHECKS: {
            MIN_IMAGE_WIDTH: 800,
            MIN_IMAGE_HEIGHT: 600,
            MAX_IMAGE_WIDTH: 4000,
            MAX_IMAGE_HEIGHT: 3000,
            MIN_TEXT_DENSITY: 0.1, // 10% da imagem deve ter texto
            MAX_BLUR_SCORE: 100, // Quanto menor, mais nítido
            MIN_CONTRAST: 0.3,
        },
        // Configuração do provedor OCR
        PROVIDER: 'tesseract', // tesseract, azure, google, aws
        PROVIDER_CONFIG: {
            tesseract: {
                languages: ['por', 'eng'], // Português e Inglês
                engineMode: 3, // LSTM only
                pageSegMode: 6, // Assume uniform text block
                whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzáéíóúâêîôûãõàèìòùçÁÉÍÓÚÂÊÎÔÛÃÕÀÈÌÒÙÇºª°%.,-+*/=()[]{} ',
            },
            azure: {
                endpoint: process.env.AZURE_OCR_ENDPOINT || '',
                apiKey: process.env.AZURE_OCR_KEY || '',
                language: 'pt',
            },
            google: {
                projectId: process.env.GOOGLE_PROJECT_ID || '',
                keyFilename: process.env.GOOGLE_KEY_FILE || '',
                languages: ['pt-BR', 'en'],
            },
            aws: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
                region: process.env.AWS_REGION || 'us-east-1',
            },
        },
        // Processamento e pós-processamento
        PROCESSING: {
            RESIZE_ENABLED: true,
            MAX_WIDTH: 2000,
            MAX_HEIGHT: 1500,
            ENHANCE_CONTRAST: true,
            REMOVE_NOISE: true,
            BINARIZE: true,
            ROTATE_AUTO: true,
        },
        // Extração de medicamentos
        DRUG_EXTRACTION: {
            ENABLED: true,
            USE_DRUG_MATCHING: true, // Integrar com Fase 5
            MIN_DRUG_CONFIDENCE: 0.5,
            PATTERNS: [
                // Padrões para identificar medicamentos
                /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(\d+(?:\.\d+)?)(mg|ml|g|mcg|ui)\b/gi,
                /\b(\d+(?:\.\d+)?)(mg|ml|g|mcg|ui)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/gi,
                /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(\d+)\s*(cps|drágea|cápsula|comprimido|solução|creme|pomada)s?\b/gi,
            ],
            BLACKLIST: [
                // Palavras a ignorar na extração
                'medicamento', 'remédio', 'farmácia', 'drogaria', 'preço', 'valor',
                'rua', 'avenida', 'número', 'bairro', 'cidade', 'estado', 'cep',
                'telefone', 'whatsapp', 'contato', 'endereço', 'localização',
            ],
        },
        // Validação e confirmação
        VALIDATION: {
            REQUIRE_USER_CONFIRMATION: true,
            AUTO_ACCEPT_HIGH_CONFIDENCE: 0.9,
            MAX_DETECTED_DRUGS: 10,
            MIN_DRUGS_FOR_QUOTE: 1,
        },
        // Storage e cache
        STORAGE: {
            PROVIDER: 'local', // local, s3, azure, gcs
            LOCAL_PATH: './uploads/ocr/',
            S3_CONFIG: {
                bucket: process.env.S3_OCR_BUCKET || '',
                region: process.env.S3_REGION || 'us-east-1',
            },
            CACHE_TTL_MINUTES: 60,
        },
        // Monitoramento e analytics
        MONITORING: {
            LOG_ALL_PROCESSINGS: false,
            LOG_FAILED_PROCESSINGS: true,
            TRACK_PROCESSING_TIME: true,
            MAX_LOGS_RETENTION_DAYS: 30,
            PERFORMANCE_ALERTS: {
                SLOW_PROCESSING_THRESHOLD_MS: 10000,
                LOW_CONFIDENCE_THRESHOLD: 0.3,
                ERROR_RATE_THRESHOLD: 0.1,
            },
        },
    },
    // Logging e Telemetria
    LOGGING: {
        LEVELS: {
            ERROR: 'error',
            WARN: 'warn',
            INFO: 'info',
            DEBUG: 'debug'
        },
        EVENTS: {
            QUOTE_CREATED: 'quote_created',
            WAVE_SENT: 'wave_sent',
            RESPONSE_RECEIVED: 'response_received',
            QUOTE_SELECTED: 'quote_selected',
            ORDER_CREATED: 'order_created'
        }
    }
};

// Helpers
export const getWaveConfig = (waveNumber: number) => {
    switch (waveNumber) {
        case 1: return PEDOMED_CONFIG.WAVES.WAVE1;
        case 2: return PEDOMED_CONFIG.WAVES.WAVE2;
        case 3: return PEDOMED_CONFIG.WAVES.WAVE3;
        default: throw new Error(`Invalid wave number: ${waveNumber}`);
    }
};

export const getWaveTimeout = (waveNumber: number) => {
    switch (waveNumber) {
        case 1: return PEDOMED_CONFIG.WAVES.WAVE1.TIMEOUT_SECONDS;
        case 2: return PEDOMED_CONFIG.WAVES.WAVE2.TIMEOUT_SECONDS;
        case 3: return PEDOMED_CONFIG.WAVES.WAVE3.TIMEOUT_SECONDS;
        default: throw new Error(`Invalid wave number: ${waveNumber}`);
    }
};

export const getTotalTimeout = (waveNumber: number) => {
    switch (waveNumber) {
        case 1: return PEDOMED_CONFIG.WAVES.WAVE1.TIMEOUT_SECONDS;
        case 2: return PEDOMED_CONFIG.WAVES.WAVE2.TOTAL_TIMEOUT_SECONDS;
        case 3: return PEDOMED_CONFIG.WAVES.WAVE3.TOTAL_TIMEOUT_SECONDS;
        default: throw new Error(`Invalid wave number: ${waveNumber}`);
    }
};

export const getCommissionRate = (module: string) => {
    return (PEDOMED_CONFIG.COMMISSIONS as any)[module] || PEDOMED_CONFIG.COMMISSIONS.DEFAULT;
};
