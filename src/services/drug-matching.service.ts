import prisma from '../lib/prisma.js';
import { PEDOMED_CONFIG } from '../config/pedomed.config.js';

export class DrugMatchingService {
    cache = new Map<string, any>();
    /**
     * Busca principal de medicamentos com matching inteligente
     */
    async searchDrugs(params) {
        const startTime = Date.now();
        const { query, userId, pharmacyId, source = 'PATIENT_QUOTE', maxResults = PEDOMED_CONFIG.DRUG_MATCHING.SEARCH.MAX_RESULTS } = params;
        // Validações
        if (query.length < PEDOMED_CONFIG.DRUG_MATCHING.SEARCH.MIN_QUERY_LENGTH) {
            return [];
        }
        if (query.length > PEDOMED_CONFIG.DRUG_MATCHING.SEARCH.MAX_QUERY_LENGTH) {
            return [];
        }
        const normalizedQuery = await this.normalizeText(query);
        try {
            // 1. Verificar cache
            const cachedResults = this.getCachedResults(normalizedQuery);
            if (cachedResults) {
                await this.logSearch({
                    searchTerm: query,
                    normalizedSearch: normalizedQuery,
                    matchedProductId: cachedResults[0]?.productId,
                    matchedAlias: cachedResults[0]?.alias,
                    confidence: cachedResults[0]?.confidence || 0,
                    userId,
                    pharmacyId,
                    source,
                    responseTimeMs: Date.now() - startTime
                });
                return cachedResults.slice(0, maxResults);
            }
            // 2. Executar busca em múltiplas estratégias
            const results = await this.performSearch(normalizedQuery, maxResults);
            // 3. Cache results
            this.cacheResults(normalizedQuery, results);
            // 4. Log search
            await this.logSearch({
                searchTerm: query,
                normalizedSearch: normalizedQuery,
                matchedProductId: results[0]?.productId,
                matchedAlias: results[0]?.alias,
                confidence: results[0]?.confidence || 0,
                userId,
                pharmacyId,
                source,
                responseTimeMs: Date.now() - startTime
            });
            return results;
        }
        catch (error) {
            console.error('[DrugMatchingService] Search error:', error);
            return [];
        }
    }
    /**
     * Executa busca usando múltiplas estratégias
     */
    async performSearch(normalizedQuery: string, maxResults: number) {
        const results: any[] = [];
        // Estratégia 1: Match exato em aliases
        const exactMatches = await this.findExactAliasMatches(normalizedQuery);
        results.push(...exactMatches);
        // Estratégia 2: Match exato em nomes de produtos
        const exactProductMatches = await this.findExactProductMatches(normalizedQuery);
        results.push(...exactProductMatches);
        // Estratégia 3: Fuzzy matching em aliases
        if (results.length < maxResults) {
            const fuzzyAliasMatches = await this.findFuzzyAliasMatches(normalizedQuery, maxResults - results.length);
            results.push(...fuzzyAliasMatches);
        }
        // Estratégia 4: Fuzzy matching em nomes de produtos
        if (results.length < maxResults) {
            const fuzzyProductMatches = await this.findFuzzyProductMatches(normalizedQuery, maxResults - results.length);
            results.push(...fuzzyProductMatches);
        }
        // Remover duplicados e ordenar por confiança
        const uniqueResults = this.deduplicateResults(results);
        return uniqueResults
            .sort((a, b) => {
                // Primeiro por confiança, depois por prioridade
                if (Math.abs(a.confidence - b.confidence) > 0.01) {
                    return b.confidence - a.confidence;
                }
                return b.priority - a.priority;
            })
            .slice(0, maxResults);
    }
    /**
     * Match exato em aliases
     */
    async findExactAliasMatches(normalizedQuery: string) {
        const aliases: any[] = await (prisma as any).drugAlias.findMany({
            where: {
                normalizedAlias: normalizedQuery,
                isActive: true
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        activeIngredient: true,
                        dosage: true,
                        type: true
                    }
                }
            },
            orderBy: [
                { priority: 'desc' },
                { usageCount: 'desc' }
            ]
        });

        return aliases.map((alias: any) => ({
            productId: alias.productId,
            productName: alias.product.name,
            alias: alias.alias,
            confidence: (PEDOMED_CONFIG.DRUG_MATCHING.ALIAS_TYPES as any)[alias.type].confidence,
            matchType: 'SYNONYM',
            priority: alias.priority
        }));
    }
    /**
     * Match exato em nomes de produtos
     */
    async findExactProductMatches(normalizedQuery: string) {
        const products = await (prisma as any).product.findMany({
            where: {
                name: {
                    contains: normalizedQuery,
                    mode: 'insensitive'
                }
            },
            select: {
                id: true,
                name: true,
                activeIngredient: true,
                dosage: true,
                type: true
            },
            take: 10
        });

        return products.map((product: any) => ({
            productId: product.id,
            productName: product.name,
            confidence: this.calculateExactMatchConfidence(normalizedQuery, this.normalizeSimple(product.name)),
            matchType: 'EXACT',
            priority: 5
        }));
    }
    /**
     * Fuzzy matching em aliases usando trigram similarity
     */
    async findFuzzyAliasMatches(normalizedQuery: string, limit: number) {
        // Placeholder para busca fuzzy via SQL raw se necessário
        const rows: any[] = [];
        return rows.map((row: any) => ({
            productId: row.productId,
            productName: row.productName,
            alias: row.alias,
            confidence: Math.min(row.similarity * (PEDOMED_CONFIG.DRUG_MATCHING.ALIAS_TYPES as any)[row.type].confidence, 0.95),
            matchType: 'FUZZY',
            distance: 1 - row.similarity,
            priority: row.priority || 0
        })).filter((result: any) => result.confidence >= PEDOMED_CONFIG.DRUG_MATCHING.FUZZY_MATCHING.MIN_CONFIDENCE);
    }
    /**
     * Fuzzy matching em nomes de produtos
     */
    async findFuzzyProductMatches(normalizedQuery: string, limit: number) {
        const rows: any[] = [];
        return rows.map((row: any) => ({
            productId: row.id,
            productName: row.name,
            confidence: Math.min(row.similarity * 0.85, 0.8),
            matchType: 'FUZZY',
            distance: 1 - row.similarity,
            priority: 0
        })).filter((result: any) => result.confidence >= PEDOMED_CONFIG.DRUG_MATCHING.FUZZY_MATCHING.MIN_CONFIDENCE);
    }
    /**
     * Normalização de texto
     */
    async normalizeText(text: string) {
        let normalized = text;
        // 1. Converter para minúsculas
        if (PEDOMED_CONFIG.DRUG_MATCHING.NORMALIZATION.LOWERCASE) {
            normalized = normalized.toLowerCase();
        }
        // 2. Remover acentos
        if (PEDOMED_CONFIG.DRUG_MATCHING.NORMALIZATION.REMOVE_DIACRITICS) {
            normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        }
        // 3. Remover caracteres especiais (manter letras, números e espaços)
        if (PEDOMED_CONFIG.DRUG_MATCHING.NORMALIZATION.REMOVE_SPECIAL_CHARS) {
            normalized = normalized.replace(/[^a-z0-9\s]/g, ' ');
        }
        // 4. Normalizar espaços múltiplos
        normalized = normalized.replace(/\s+/g, ' ').trim();
        // 5. Normalizar números (ex: "5mg" -> "5 mg")
        if (PEDOMED_CONFIG.DRUG_MATCHING.NORMALIZATION.NORMALIZE_NUMBERS) {
            normalized = normalized.replace(/(\d)(mg|ml|g|mcg|ui)/gi, '$1 $2');
        }
        // 6. Aplicar regras de normalização customizadas
        normalized = await this.applyCustomNormalizationRules(normalized);
        return normalized;
    }
    /**
     * Versão simples e síncrona de normalização para uso interno
     */
    normalizeSimple(text: string) {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
    /**
     * Aplica regras de normalização customizadas do banco
     */
    async applyCustomNormalizationRules(text: string) {
        const rules = await (prisma as any).drugNormalizationRule.findMany({
            where: { isActive: true },
            orderBy: { order: 'asc' }
        });
        let normalized = text;
        for (const rule of rules) {
            try {
                const regex = new RegExp(rule.pattern, 'gi');
                normalized = normalized.replace(regex, rule.replacement);
            }
            catch (error) {
                console.warn(`[DrugMatching] Invalid regex rule: ${rule.pattern}`);
            }
        }
        return normalized;
    }
    /**
     * Calcula confiança para match exato
     */
    calculateExactMatchConfidence(query: string, target: string) {
        if (query === target) return 1.0;
        if (target.includes(query)) return 0.9;
        return 0.8;
    }

    deduplicateResults(results: any[]) {
        const seen = new Map<string, any>();
        for (const result of results) {
            const key = result.productId;
            if (!seen.has(key) || seen.get(key).confidence < result.confidence) {
                seen.set(key, result);
            }
        }
        return Array.from(seen.values());
    }
    /**
     * Gerenciamento de cache
     */
    getCachedResults(normalizedQuery: string) {
        const cached = this.cache.get(normalizedQuery);
        if (cached && cached.expiresAt > new Date()) {
            if (cached.expiresAt.hitCount !== undefined) cached.expiresAt.hitCount++;
            return cached.results;
        }
        if (cached) {
            this.cache.delete(normalizedQuery);
        }
        return null;
    }
    cacheResults(normalizedQuery: string, results: any[]) {
        const expiresAt = new Date(Date.now() + PEDOMED_CONFIG.DRUG_MATCHING.CACHE.TTL_MINUTES * 60 * 1000);
        this.cache.set(normalizedQuery, { results, expiresAt });
    }
    /**
     * Log de buscas para análise
     */
    async logSearch(params) {
        try {
            console.log(`[DrugMatching] Search: "${params.searchTerm}" -> ${params.matchedProductId || 'NO_MATCH'} (${params.confidence})`);
            await (prisma as any).drugSearchLog.create({
                data: {
                    searchTerm: params.searchTerm,
                    normalizedSearch: params.normalizedSearch,
                    matchedProductId: params.matchedProductId,
                    matchedAlias: params.matchedAlias,
                    confidence: params.confidence,
                    userId: params.userId,
                    pharmacyId: params.pharmacyId,
                    source: params.source,
                    responseTimeMs: params.responseTimeMs
                }
            });
            // Atualizar usage count do alias se houver match
            if (params.matchedAlias && params.matchedProductId) {
                await (prisma as any).drugAlias.updateMany({
                    where: {
                        productId: params.matchedProductId,
                        alias: params.matchedAlias
                    },
                    data: {
                        usageCount: { increment: 1 }
                    }
                });
            }
        }
        catch (error) {
            console.error('[DrugMatching] Error logging search:', error);
        }
    }
    /**
     * Obtém estatísticas do sistema
     */
    async getStats(days = 30) {
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const [totalSearches, successfulMatches, avgConfidence, topMissedSearches, topAliases, cacheSize] = await Promise.all([
            // Total de buscas
            (prisma as any).drugSearchLog.count({
                where: { createdAt: { gte: startDate } }
            }),
            // Buscas bem-sucedidas
            (prisma as any).drugSearchLog.count({
                where: {
                    createdAt: { gte: startDate },
                    matchedProductId: { not: null }
                }
            }),
            // Confiança média
            (prisma as any).drugSearchLog.aggregate({
                where: {
                    createdAt: { gte: startDate },
                    matchedProductId: { not: null }
                },
                _avg: { confidence: true }
            }),
            // Top buscas falhadas
            (prisma as any).drugSearchLog.groupBy({
                by: ['searchTerm'],
                where: {
                    createdAt: { gte: startDate },
                    matchedProductId: null
                },
                _count: { searchTerm: true },
                orderBy: { _count: { searchTerm: 'desc' } },
                take: 10
            }),
            // Top aliases usados
            (prisma as any).drugAlias.findMany({
                where: { isActive: true },
                include: {
                    product: {
                        select: { name: true }
                    }
                },
                orderBy: { usageCount: 'desc' },
                take: 10
            }),
            // Cache size
            Promise.resolve(this.cache.size)
        ]);
        return {
            totalSearches,
            successfulMatches,
            averageConfidence: avgConfidence._avg.confidence || 0,
            topMissedSearches: topMissedSearches.map((item: any) => ({
                term: item.searchTerm,
                count: (item as any)._count.searchTerm
            })),
            topAliases: topAliases.map((alias: any) => ({
                alias: alias.alias,
                productId: alias.productId,
                productName: alias.product.name,
                usageCount: alias.usageCount
            })),
            performanceMetrics: {
                averageResponseTime: 0,
                cacheHitRate: 0,
                matchByType: {}
            }
        };
    }
    /**
     * Limpa cache expirado
     */
    cleanupExpiredCache() {
        const now = new Date();
        for (const [key, cached] of this.cache.entries()) {
            if (cached.expiresAt <= now) {
                this.cache.delete(key);
            }
        }
    }
    /**
     * Adiciona novo alias manualmente
     */
    async addAlias(params) {
        console.log(`[DrugMatching] Add alias: "${params.alias}" -> ${params.productId} (${params.type})`);
        const normalizedAlias = await this.normalizeText(params.alias);
        await (prisma as any).drugAlias.create({
            data: {
                productId: params.productId,
                alias: params.alias,
                normalizedAlias,
                type: params.type,
                priority: params.priority || (PEDOMED_CONFIG.DRUG_MATCHING.ALIAS_TYPES as any)[params.type].priority
            }
        });
        // Limpar cache relacionado
        this.clearRelatedCache(normalizedAlias);
    }
    /**
     * Limpa cache relacionado a um termo
     */
    clearRelatedCache(normalizedTerm: string) {
        for (const key of this.cache.keys()) {
            if (key.includes(normalizedTerm) || normalizedTerm.includes(key)) {
                this.cache.delete(key);
            }
        }
    }
}
