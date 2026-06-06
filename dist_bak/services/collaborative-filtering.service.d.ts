/**
 * PROJETO CÉREBRO - FASE 2: MOTOR DE AFINIDADES
 * Sistema de filtragem colaborativa "usuários parecidos também gostaram"
 * Aprendendo com a inteligência coletiva da base de usuários
 */
export interface UserInteraction {
    user_id: string;
    item_id: string;
    interaction_type: 'iniciou' | 'completou' | 'salvou' | 'avaliou' | 'compartilhou';
    rating?: number;
    timestamp: string;
    context?: string;
    session_id?: string;
    time_spent?: number;
}
export interface ItemSimilarity {
    item_a: string;
    item_b: string;
    similarity_score: number;
    common_users: number;
    confidence: number;
    calculated_at: string;
}
export interface UserSimilarity {
    user_a: string;
    user_b: string;
    similarity_score: number;
    common_items: number;
    jaccard_index: number;
    cosine_similarity: number;
    calculated_at: string;
}
export interface CollaborativeRecommendation {
    item_id: string;
    predicted_rating: number;
    confidence: number;
    reasoning: {
        similar_users: string[];
        similar_items: string[];
        interaction_patterns: string[];
    };
    source: 'user_based' | 'item_based' | 'hybrid';
}
export interface RecommendationContext {
    user_id: string;
    context: 'home' | 'post_challenge' | 'discover';
    user_history: UserInteraction[];
    user_preferences: {
        preferred_types: string[];
        avg_rating: number;
        completion_rate: number;
    };
    exclude_items?: string[];
}
export declare class CollaborativeFilteringService {
    private readonly MIN_INTERACTIONS;
    private readonly MIN_COMMON_ITEMS;
    private readonly SIMILARITY_THRESHOLD;
    /**
     * ALGORITMO PRINCIPAL: Filtragem Colaborativa Híbrida
     * Combina user-based e item-based collaborative filtering
     */
    generateCollaborativeRecommendations(context: RecommendationContext, limit?: number): Promise<CollaborativeRecommendation[]>;
    /**
     * USER-BASED COLLABORATIVE FILTERING
     * "Usuários parecidos com você também gostaram de..."
     */
    private getUserBasedRecommendations;
    /**
     * ITEM-BASED COLLABORATIVE FILTERING
     * "Quem gostou disto também gostou daquilo"
     */
    private getItemBasedRecommendations;
    /**
     * Calcula similaridade entre usuários usando Jaccard + Cosine
     */
    calculateUserSimilarity(userA: string, userB: string): Promise<UserSimilarity | null>;
    /**
     * Calcula similaridade entre itens baseada em co-ocorrência
     */
    calculateItemSimilarity(itemA: string, itemB: string): Promise<ItemSimilarity | null>;
    /**
     * Processa dados em lote para calcular similaridades
     */
    batchCalculateSimilarities(): Promise<{
        userSimilarities: number;
        itemSimilarities: number;
        processingTime: number;
    }>;
    /**
     * Atualiza similaridades incrementalmente baseado em novas interações
     */
    updateSimilaritiesIncremental(newInteractions: UserInteraction[]): Promise<void>;
    private calculateCosineSimilarity;
    private interactionToRating;
    private predictUserRating;
    private combineRecommendations;
    private applyDiversityFilters;
    private findSimilarUsers;
    private findSimilarItems;
    private getUserInteractions;
    private getItemsFromSimilarUsers;
    private getUsersWhoInteractedWith;
    private getActiveUsers;
    private getPopularItems;
    private getFallbackRecommendations;
    private saveUserSimilarity;
    private saveItemSimilarity;
}
export default CollaborativeFilteringService;
//# sourceMappingURL=collaborative-filtering.service.d.ts.map