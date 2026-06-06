/**
 * Configurações Centralizadas - PedeMed Engine
 * Baseado no documento de decisões técnicas
 */
export declare const PEDOMED_CONFIG: {
    GEOLOCATION: {
        DEFAULT_RADIUS_KM: number;
        MAX_RADIUS_KM: number;
        EARTH_RADIUS_KM: number;
        PRECISION_DECIMALS: number;
    };
    WAVES: {
        WAVE1: {
            PHARMACY_COUNT: number;
            TIMEOUT_SECONDS: number;
            RADIUS_KM: number;
        };
        WAVE2: {
            ADDITIONAL_PHARMACIES: number;
            TIMEOUT_SECONDS: number;
            ADDITIONAL_RADIUS_KM: number;
            TOTAL_TIMEOUT_SECONDS: number;
        };
        WAVE3: {
            ALL_ELIGIBLE: boolean;
            TIMEOUT_SECONDS: number;
            MAX_RADIUS_KM: number;
            TOTAL_TIMEOUT_SECONDS: number;
        };
    };
    SLAS: {
        PHARMACY_RESPONSE_MAX_SECONDS: number;
        QUOTE_EXPIRATION_HOURS: number;
        CLEANUP_AFTER_EXPIRATION_HOURS: number;
    };
    LIMITS: {
        MAX_QUOTES_PER_HOUR_PER_PATIENT: number;
        MAX_ITEMS_PER_QUOTE: number;
        MAX_PHARMACIES_PER_WAVE: number;
        MIN_QUOTE_VALUE: number;
        MAX_QUOTE_VALUE: number;
    };
    ELIGIBILITY: {
        MIN_PHARMACY_SCORE: number;
        REQUIRED_STOCK_RATIO: number;
        MAX_DISTANCE_KM: number;
        ACTIVE_STATUS: string;
    };
    COMMISSIONS: Record<string, number>;
    NOTIFICATIONS: {
        MAX_PER_USER: number;
        EVENTS: {
            NEW_QUOTE: string;
            QUOTE_UPDATE: string;
            NEW_RESPONSE: string;
            QUOTE_EXPIRED: string;
        };
        SOCKET: {
            PING_INTERVAL: number;
            PING_TIMEOUT: number;
        };
    };
    QUEUE: {
        NAME: string;
        CONCURRENCY: number;
        MAX_RETRIES: number;
        RETRY_BACKOFF: {
            type: string;
            delay: number;
        };
        REMOVE_ON_COMPLETE: number;
        REMOVE_ON_FAIL: number;
    };
    VALIDATION: {
        PRODUCT_NAME: {
            MIN_LENGTH: number;
            MAX_LENGTH: number;
            ALLOWED_CHARS: RegExp;
        };
        QUANTITY: {
            MIN: number;
            MAX: number;
            MUST_BE_INTEGER: boolean;
        };
        NOTES: {
            MAX_LENGTH: number;
        };
    };
    PERFORMANCE_SCORE: {
        WEIGHTS: {
            RESPONSE_TIME: number;
            RESPONSE_RATE: number;
            PRICE_COMPETITIVENESS: number;
            DISTANCE: number;
            PLAN_TYPE: number;
        };
        MIN_SCORE: number;
        MAX_SCORE: number;
        DEFAULT_NEW_PHARMACY_SCORE: number;
        RESPONSE_TIME_TARGET_MINUTES: number;
        RESPONSE_TIME_MAX_MINUTES: number;
        RESPONSE_RATE_MINIMUM: number;
        RESPONSE_RATE_EXCELLENT: number;
        PRICE_VS_MARKET_AVERAGE: number;
        PRICE_COMPETITIVE_THRESHOLD: number;
        PRICE_EXPENSIVE_THRESHOLD: number;
        PLAN_SCORES: {
            BASIC: number;
            PRO: number;
            PREMIUM: number;
        };
        SNAPSHOT_INTERVAL_HOURS: number;
        SCORE_RECALCULATION_MINUTES: number;
        SCORE_DECAY_FACTOR_PER_WEEK: number;
        MIN_QUOTES_FOR_SCORE: number;
    };
    DRUG_MATCHING: {
        CACHE: {
            TTL_MINUTES: number;
            MAX_RESULTS: number;
            CLEANUP_INTERVAL_MINUTES: number;
        };
        FUZZY_MATCHING: {
            MIN_CONFIDENCE: number;
            EXACT_MATCH_CONFIDENCE: number;
            NORMALIZED_MATCH_CONFIDENCE: number;
            SYNONYM_MATCH_CONFIDENCE: number;
            MAX_EDIT_DISTANCE: number;
            MIN_TRIGRAM_SIMILARITY: number;
        };
        SEARCH: {
            MAX_RESULTS: number;
            MAX_QUERY_LENGTH: number;
            MIN_QUERY_LENGTH: number;
            TIMEOUT_MS: number;
        };
        ALIAS_TYPES: {
            BRAND: {
                priority: number;
                confidence: number;
            };
            GENERIC: {
                priority: number;
                confidence: number;
            };
            COMMON: {
                priority: number;
                confidence: number;
            };
            ABBREVIATION: {
                priority: number;
                confidence: number;
            };
            MISSPELLING: {
                priority: number;
                confidence: number;
            };
        };
        LEARNING: {
            ENABLED: boolean;
            MIN_OCCURRENCES_FOR_ALIAS: number;
            SUCCESS_RATE_THRESHOLD: number;
            AUTO_CREATE_MISSPELLINGS: boolean;
            ANALYSIS_INTERVAL_HOURS: number;
        };
        MONITORING: {
            LOG_ALL_SEARCHES: boolean;
            LOG_FAILED_SEARCHES: boolean;
            TRACK_RESPONSE_TIMES: boolean;
            MAX_LOGS_RETENTION_DAYS: number;
        };
        NORMALIZATION: {
            REMOVE_DIACRITICS: boolean;
            LOWERCASE: boolean;
            REMOVE_SPECIAL_CHARS: boolean;
            NORMALIZE_NUMBERS: boolean;
            EXPAND_ABBREVIATIONS: boolean;
        };
    };
    OCR: {
        ENABLED: boolean;
        MAX_FILE_SIZE: number;
        ALLOWED_FORMATS: string[];
        MIN_CONFIDENCE_THRESHOLD: number;
        PROCESSING_TIMEOUT_MS: number;
        QUALITY_CHECKS: {
            MIN_IMAGE_WIDTH: number;
            MIN_IMAGE_HEIGHT: number;
            MAX_IMAGE_WIDTH: number;
            MAX_IMAGE_HEIGHT: number;
            MIN_TEXT_DENSITY: number;
            MAX_BLUR_SCORE: number;
            MIN_CONTRAST: number;
        };
        PROVIDER: string;
        PROVIDER_CONFIG: {
            tesseract: {
                languages: string[];
                engineMode: number;
                pageSegMode: number;
                whitelist: string;
            };
            azure: {
                endpoint: string;
                apiKey: string;
                language: string;
            };
            google: {
                projectId: string;
                keyFilename: string;
                languages: string[];
            };
            aws: {
                accessKeyId: string;
                secretAccessKey: string;
                region: string;
            };
        };
        PROCESSING: {
            RESIZE_ENABLED: boolean;
            MAX_WIDTH: number;
            MAX_HEIGHT: number;
            ENHANCE_CONTRAST: boolean;
            REMOVE_NOISE: boolean;
            BINARIZE: boolean;
            ROTATE_AUTO: boolean;
        };
        DRUG_EXTRACTION: {
            ENABLED: boolean;
            USE_DRUG_MATCHING: boolean;
            MIN_DRUG_CONFIDENCE: number;
            PATTERNS: RegExp[];
            BLACKLIST: string[];
        };
        VALIDATION: {
            REQUIRE_USER_CONFIRMATION: boolean;
            AUTO_ACCEPT_HIGH_CONFIDENCE: number;
            MAX_DETECTED_DRUGS: number;
            MIN_DRUGS_FOR_QUOTE: number;
        };
        STORAGE: {
            PROVIDER: string;
            LOCAL_PATH: string;
            S3_CONFIG: {
                bucket: string;
                region: string;
            };
            CACHE_TTL_MINUTES: number;
        };
        MONITORING: {
            LOG_ALL_PROCESSINGS: boolean;
            LOG_FAILED_PROCESSINGS: boolean;
            TRACK_PROCESSING_TIME: boolean;
            MAX_LOGS_RETENTION_DAYS: number;
            PERFORMANCE_ALERTS: {
                SLOW_PROCESSING_THRESHOLD_MS: number;
                LOW_CONFIDENCE_THRESHOLD: number;
                ERROR_RATE_THRESHOLD: number;
            };
        };
    };
    LOGGING: {
        LEVELS: {
            ERROR: string;
            WARN: string;
            INFO: string;
            DEBUG: string;
        };
        EVENTS: {
            QUOTE_CREATED: string;
            WAVE_SENT: string;
            RESPONSE_RECEIVED: string;
            QUOTE_SELECTED: string;
            ORDER_CREATED: string;
        };
    };
};
export declare const getWaveConfig: (waveNumber: number) => {
    PHARMACY_COUNT: number;
    TIMEOUT_SECONDS: number;
    RADIUS_KM: number;
} | {
    ADDITIONAL_PHARMACIES: number;
    TIMEOUT_SECONDS: number;
    ADDITIONAL_RADIUS_KM: number;
    TOTAL_TIMEOUT_SECONDS: number;
} | {
    ALL_ELIGIBLE: boolean;
    TIMEOUT_SECONDS: number;
    MAX_RADIUS_KM: number;
    TOTAL_TIMEOUT_SECONDS: number;
};
export declare const getWaveTimeout: (waveNumber: number) => number;
export declare const getTotalTimeout: (waveNumber: number) => number;
export declare const getCommissionRate: (module: string) => any;
//# sourceMappingURL=pedomed.config.d.ts.map