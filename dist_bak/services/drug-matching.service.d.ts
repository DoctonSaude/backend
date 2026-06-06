export declare class DrugMatchingService {
    cache: Map<string, any>;
    /**
     * Busca principal de medicamentos com matching inteligente
     */
    searchDrugs(params: any): Promise<any>;
    /**
     * Executa busca usando múltiplas estratégias
     */
    performSearch(normalizedQuery: string, maxResults: number): Promise<any[]>;
    /**
     * Match exato em aliases
     */
    findExactAliasMatches(normalizedQuery: string): Promise<{
        productId: any;
        productName: any;
        alias: any;
        confidence: any;
        matchType: string;
        priority: any;
    }[]>;
    /**
     * Match exato em nomes de produtos
     */
    findExactProductMatches(normalizedQuery: string): Promise<any>;
    /**
     * Fuzzy matching em aliases usando trigram similarity
     */
    findFuzzyAliasMatches(normalizedQuery: string, limit: number): Promise<{
        productId: any;
        productName: any;
        alias: any;
        confidence: number;
        matchType: string;
        distance: number;
        priority: any;
    }[]>;
    /**
     * Fuzzy matching em nomes de produtos
     */
    findFuzzyProductMatches(normalizedQuery: string, limit: number): Promise<{
        productId: any;
        productName: any;
        confidence: number;
        matchType: string;
        distance: number;
        priority: number;
    }[]>;
    /**
     * Normalização de texto
     */
    normalizeText(text: string): Promise<string>;
    /**
     * Versão simples e síncrona de normalização para uso interno
     */
    normalizeSimple(text: string): string;
    /**
     * Aplica regras de normalização customizadas do banco
     */
    applyCustomNormalizationRules(text: string): Promise<string>;
    /**
     * Calcula confiança para match exato
     */
    calculateExactMatchConfidence(query: string, target: string): 1 | 0.9 | 0.8;
    deduplicateResults(results: any[]): any[];
    /**
     * Gerenciamento de cache
     */
    getCachedResults(normalizedQuery: string): any;
    cacheResults(normalizedQuery: string, results: any[]): void;
    /**
     * Log de buscas para análise
     */
    logSearch(params: any): Promise<void>;
    /**
     * Obtém estatísticas do sistema
     */
    getStats(days?: number): Promise<{
        totalSearches: any;
        successfulMatches: any;
        averageConfidence: any;
        topMissedSearches: any;
        topAliases: any;
        performanceMetrics: {
            averageResponseTime: number;
            cacheHitRate: number;
            matchByType: {};
        };
    }>;
    /**
     * Limpa cache expirado
     */
    cleanupExpiredCache(): void;
    /**
     * Adiciona novo alias manualmente
     */
    addAlias(params: any): Promise<void>;
    /**
     * Limpa cache relacionado a um termo
     */
    clearRelatedCache(normalizedTerm: string): void;
}
//# sourceMappingURL=drug-matching.service.d.ts.map