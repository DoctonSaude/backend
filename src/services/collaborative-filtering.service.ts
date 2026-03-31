/**
 * PROJETO CÉREBRO - FASE 2: MOTOR DE AFINIDADES
 * Sistema de filtragem colaborativa "usuários parecidos também gostaram"
 * Aprendendo com a inteligência coletiva da base de usuários
 */

export interface UserInteraction {
  user_id: string;
  item_id: string;
  interaction_type: 'iniciou' | 'completou' | 'salvou' | 'avaliou' | 'compartilhou';
  rating?: number; // 1-5 para avaliações
  timestamp: string;
  context?: string;
  session_id?: string;
  time_spent?: number; // segundos
}

export interface ItemSimilarity {
  item_a: string;
  item_b: string;
  similarity_score: number; // 0-1
  common_users: number;
  confidence: number;
  calculated_at: string;
}

export interface UserSimilarity {
  user_a: string;
  user_b: string;
  similarity_score: number; // 0-1
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

export class CollaborativeFilteringService {
  private readonly MIN_INTERACTIONS = 5; // Mínimo de interações para considerar usuário
  private readonly MIN_COMMON_ITEMS = 3; // Mínimo de itens em comum para similaridade
  private readonly SIMILARITY_THRESHOLD = 0.3; // Threshold mínimo de similaridade
  
  /**
   * ALGORITMO PRINCIPAL: Filtragem Colaborativa Híbrida
   * Combina user-based e item-based collaborative filtering
   */
  async generateCollaborativeRecommendations(
    context: RecommendationContext,
    limit: number = 10
  ): Promise<CollaborativeRecommendation[]> {
    
    console.log(`🤝 Generating collaborative recommendations for user ${context.user_id}`);
    
    try {
      // 1. Verificar se usuário tem interações suficientes
      if (context.user_history.length < this.MIN_INTERACTIONS) {
        console.log(`⚠️ User ${context.user_id} has insufficient interactions (${context.user_history.length})`);
        return await this.getFallbackRecommendations(context, limit);
      }
      
      // 2. Gerar recomendações baseadas em usuários similares
      const userBasedRecs = await this.getUserBasedRecommendations(context, Math.ceil(limit * 0.6));
      
      // 3. Gerar recomendações baseadas em itens similares
      const itemBasedRecs = await this.getItemBasedRecommendations(context, Math.ceil(limit * 0.6));
      
      // 4. Combinar e rankear recomendações
      const hybridRecs = this.combineRecommendations(userBasedRecs, itemBasedRecs, limit);
      
      // 5. Aplicar filtros de diversidade e novidade
      const finalRecs = this.applyDiversityFilters(hybridRecs, context);
      
      console.log(`✅ Generated ${finalRecs.length} collaborative recommendations`);
      return finalRecs.slice(0, limit);
      
    } catch (error) {
      console.error('❌ Error in collaborative filtering:', error);
      return await this.getFallbackRecommendations(context, limit);
    }
  }

  /**
   * USER-BASED COLLABORATIVE FILTERING
   * "Usuários parecidos com você também gostaram de..."
   */
  private async getUserBasedRecommendations(
    context: RecommendationContext,
    limit: number
  ): Promise<CollaborativeRecommendation[]> {
    
    // 1. Encontrar usuários similares
    const similarUsers = await this.findSimilarUsers(context.user_id, 50);
    
    if (similarUsers.length === 0) {
      return [];
    }
    
    // 2. Coletar itens que usuários similares gostaram
    const candidateItems = await this.getItemsFromSimilarUsers(similarUsers, context);
    
    // 3. Calcular ratings preditos
    const recommendations: CollaborativeRecommendation[] = [];
    
    for (const item of candidateItems) {
      const prediction = await this.predictUserRating(context.user_id, item.item_id, similarUsers);
      
      if (prediction.confidence > 0.3) {
        recommendations.push({
          item_id: item.item_id,
          predicted_rating: prediction.rating,
          confidence: prediction.confidence,
          reasoning: {
            similar_users: prediction.similar_users,
            similar_items: [],
            interaction_patterns: prediction.patterns
          },
          source: 'user_based'
        });
      }
    }
    
    // 4. Ordenar por rating predito e confiança
    return recommendations
      .sort((a, b) => (b.predicted_rating * b.confidence) - (a.predicted_rating * a.confidence))
      .slice(0, limit);
  }

  /**
   * ITEM-BASED COLLABORATIVE FILTERING
   * "Quem gostou disto também gostou daquilo"
   */
  private async getItemBasedRecommendations(
    context: RecommendationContext,
    limit: number
  ): Promise<CollaborativeRecommendation[]> {
    
    // 1. Pegar itens que o usuário gostou (rating >= 4 ou completou)
    const likedItems = context.user_history.filter(interaction => 
      interaction.interaction_type === 'completou' || 
      (interaction.rating && interaction.rating >= 4)
    ).map(i => i.item_id);
    
    if (likedItems.length === 0) {
      return [];
    }
    
    // 2. Encontrar itens similares para cada item que o usuário gostou
    const candidateItems = new Map<string, { score: number; sources: string[] }>();
    
    for (const likedItem of likedItems) {
      const similarItems = await this.findSimilarItems(likedItem, 20);
      
      for (const similar of similarItems) {
        const existing = candidateItems.get(similar.item_b) || { score: 0, sources: [] };
        existing.score += similar.similarity_score;
        existing.sources.push(likedItem);
        candidateItems.set(similar.item_b, existing);
      }
    }
    
    // 3. Converter para recomendações
    const recommendations: CollaborativeRecommendation[] = [];
    
    for (const [itemId, data] of candidateItems.entries()) {
      // Excluir itens que o usuário já interagiu
      if (context.user_history.some(h => h.item_id === itemId)) {
        continue;
      }
      
      const avgSimilarity = data.score / data.sources.length;
      const confidence = Math.min(data.sources.length / 3, 1); // Mais fontes = mais confiança
      
      recommendations.push({
        item_id: itemId,
        predicted_rating: avgSimilarity * 5, // Converter para escala 1-5
        confidence,
        reasoning: {
          similar_users: [],
          similar_items: data.sources,
          interaction_patterns: [`Baseado em ${data.sources.length} itens similares`]
        },
        source: 'item_based'
      });
    }
    
    return recommendations
      .sort((a, b) => (b.predicted_rating * b.confidence) - (a.predicted_rating * a.confidence))
      .slice(0, limit);
  }

  /**
   * Calcula similaridade entre usuários usando Jaccard + Cosine
   */
  async calculateUserSimilarity(userA: string, userB: string): Promise<UserSimilarity | null> {
    const interactionsA = await this.getUserInteractions(userA);
    const interactionsB = await this.getUserInteractions(userB);
    
    if (interactionsA.length < this.MIN_INTERACTIONS || interactionsB.length < this.MIN_INTERACTIONS) {
      return null;
    }
    
    const itemsA = new Set(interactionsA.map(i => i.item_id));
    const itemsB = new Set(interactionsB.map(i => i.item_id));
    
    // Jaccard Index: |A ∩ B| / |A ∪ B|
    const intersection = new Set([...itemsA].filter(x => itemsB.has(x)));
    const union = new Set([...itemsA, ...itemsB]);
    const jaccardIndex = intersection.size / union.size;
    
    if (intersection.size < this.MIN_COMMON_ITEMS) {
      return null;
    }
    
    // Cosine Similarity baseado em ratings
    const cosineSimilarity = this.calculateCosineSimilarity(interactionsA, interactionsB, intersection);
    
    // Similaridade final (média ponderada)
    const finalSimilarity = (jaccardIndex * 0.4) + (cosineSimilarity * 0.6);
    
    return {
      user_a: userA,
      user_b: userB,
      similarity_score: finalSimilarity,
      common_items: intersection.size,
      jaccard_index: jaccardIndex,
      cosine_similarity: cosineSimilarity,
      calculated_at: new Date().toISOString()
    };
  }

  /**
   * Calcula similaridade entre itens baseada em co-ocorrência
   */
  async calculateItemSimilarity(itemA: string, itemB: string): Promise<ItemSimilarity | null> {
    const usersA = await this.getUsersWhoInteractedWith(itemA);
    const usersB = await this.getUsersWhoInteractedWith(itemB);
    
    if (usersA.length < 3 || usersB.length < 3) {
      return null;
    }
    
    const commonUsers = usersA.filter(user => usersB.includes(user));
    
    if (commonUsers.length < 2) {
      return null;
    }
    
    // Similaridade baseada em Jaccard dos usuários
    const similarity = commonUsers.length / new Set([...usersA, ...usersB]).size;
    
    // Boost para itens com mais co-ocorrências
    const confidence = Math.min(commonUsers.length / 10, 1);
    
    return {
      item_a: itemA,
      item_b: itemB,
      similarity_score: similarity,
      common_users: commonUsers.length,
      confidence,
      calculated_at: new Date().toISOString()
    };
  }

  /**
   * Processa dados em lote para calcular similaridades
   */
  async batchCalculateSimilarities(): Promise<{
    userSimilarities: number;
    itemSimilarities: number;
    processingTime: number;
  }> {
    
    const startTime = Date.now();
    console.log('🔄 Starting batch similarity calculation...');
    
    // 1. Calcular similaridades entre usuários
    const activeUsers = await this.getActiveUsers();
    let userSimilarities = 0;
    
    for (let i = 0; i < activeUsers.length; i++) {
      for (let j = i + 1; j < activeUsers.length; j++) {
        const similarity = await this.calculateUserSimilarity(activeUsers[i], activeUsers[j]);
        if (similarity && similarity.similarity_score > this.SIMILARITY_THRESHOLD) {
          await this.saveUserSimilarity(similarity);
          userSimilarities++;
        }
      }
    }
    
    // 2. Calcular similaridades entre itens
    const popularItems = await this.getPopularItems();
    let itemSimilarities = 0;
    
    for (let i = 0; i < popularItems.length; i++) {
      for (let j = i + 1; j < popularItems.length; j++) {
        const similarity = await this.calculateItemSimilarity(popularItems[i], popularItems[j]);
        if (similarity && similarity.similarity_score > this.SIMILARITY_THRESHOLD) {
          await this.saveItemSimilarity(similarity);
          itemSimilarities++;
        }
      }
    }
    
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ Batch processing complete: ${userSimilarities} user similarities, ${itemSimilarities} item similarities in ${processingTime}ms`);
    
    return {
      userSimilarities,
      itemSimilarities,
      processingTime
    };
  }

  /**
   * Atualiza similaridades incrementalmente baseado em novas interações
   */
  async updateSimilaritiesIncremental(newInteractions: UserInteraction[]): Promise<void> {
    const affectedUsers = new Set(newInteractions.map(i => i.user_id));
    const affectedItems = new Set(newInteractions.map(i => i.item_id));
    
    // Atualizar similaridades de usuários afetados
    for (const userId of affectedUsers) {
      const similarUsers = await this.findSimilarUsers(userId, 100);
      
      for (const similar of similarUsers) {
        const newSimilarity = await this.calculateUserSimilarity(userId, similar.user_b);
        if (newSimilarity) {
          await this.saveUserSimilarity(newSimilarity);
        }
      }
    }
    
    // Atualizar similaridades de itens afetados
    for (const itemId of affectedItems) {
      const similarItems = await this.findSimilarItems(itemId, 100);
      
      for (const similar of similarItems) {
        const newSimilarity = await this.calculateItemSimilarity(itemId, similar.item_b);
        if (newSimilarity) {
          await this.saveItemSimilarity(newSimilarity);
        }
      }
    }
    
    console.log(`🔄 Updated similarities for ${affectedUsers.size} users and ${affectedItems.size} items`);
  }

  // MÉTODOS AUXILIARES

  private calculateCosineSimilarity(
    interactionsA: UserInteraction[],
    interactionsB: UserInteraction[],
    commonItems: Set<string>
  ): number {
    
    const ratingsA = new Map<string, number>();
    const ratingsB = new Map<string, number>();
    
    // Converter interações em ratings (1-5)
    for (const interaction of interactionsA) {
      ratingsA.set(interaction.item_id, this.interactionToRating(interaction));
    }
    
    for (const interaction of interactionsB) {
      ratingsB.set(interaction.item_id, this.interactionToRating(interaction));
    }
    
    // Calcular cosine similarity apenas para itens em comum
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (const item of commonItems) {
      const ratingA = ratingsA.get(item) || 0;
      const ratingB = ratingsB.get(item) || 0;
      
      dotProduct += ratingA * ratingB;
      normA += ratingA * ratingA;
      normB += ratingB * ratingB;
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private interactionToRating(interaction: UserInteraction): number {
    if (interaction.rating) return interaction.rating;
    
    switch (interaction.interaction_type) {
      case 'completou': return 5;
      case 'salvou': return 4;
      case 'compartilhou': return 4;
      case 'iniciou': return 3;
      default: return 2;
    }
  }

  private async predictUserRating(
    userId: string,
    itemId: string,
    similarUsers: UserSimilarity[]
  ): Promise<{
    rating: number;
    confidence: number;
    similar_users: string[];
    patterns: string[];
  }> {
    
    let weightedSum = 0;
    let weightSum = 0;
    const contributingUsers: string[] = [];
    const patterns: string[] = [];
    
    for (const similar of similarUsers.slice(0, 10)) { // Top 10 usuários similares
      const userInteractions = await this.getUserInteractions(similar.user_b);
      const itemInteraction = userInteractions.find(i => i.item_id === itemId);
      
      if (itemInteraction) {
        const rating = this.interactionToRating(itemInteraction);
        const weight = similar.similarity_score;
        
        weightedSum += rating * weight;
        weightSum += weight;
        contributingUsers.push(similar.user_b);
        patterns.push(`Usuário similar (${(similar.similarity_score * 100).toFixed(1)}%) deu rating ${rating}`);
      }
    }
    
    if (weightSum === 0) {
      return { rating: 3, confidence: 0, similar_users: [], patterns: [] };
    }
    
    const predictedRating = weightedSum / weightSum;
    const confidence = Math.min(contributingUsers.length / 5, 1); // Mais usuários = mais confiança
    
    return {
      rating: predictedRating,
      confidence,
      similar_users: contributingUsers,
      patterns
    };
  }

  private combineRecommendations(
    userBased: CollaborativeRecommendation[],
    itemBased: CollaborativeRecommendation[],
    limit: number
  ): CollaborativeRecommendation[] {
    
    const combined = new Map<string, CollaborativeRecommendation>();
    
    // Adicionar recomendações user-based
    for (const rec of userBased) {
      combined.set(rec.item_id, rec);
    }
    
    // Combinar com item-based (média ponderada se item já existe)
    for (const rec of itemBased) {
      const existing = combined.get(rec.item_id);
      
      if (existing) {
        // Híbrido: média ponderada
        const totalConfidence = existing.confidence + rec.confidence;
        const hybridRating = (existing.predicted_rating * existing.confidence + rec.predicted_rating * rec.confidence) / totalConfidence;
        
        combined.set(rec.item_id, {
          ...existing,
          predicted_rating: hybridRating,
          confidence: Math.min(totalConfidence, 1),
          reasoning: {
            similar_users: [...existing.reasoning.similar_users, ...rec.reasoning.similar_users],
            similar_items: [...existing.reasoning.similar_items, ...rec.reasoning.similar_items],
            interaction_patterns: [...existing.reasoning.interaction_patterns, ...rec.reasoning.interaction_patterns]
          },
          source: 'hybrid'
        });
      } else {
        combined.set(rec.item_id, rec);
      }
    }
    
    return Array.from(combined.values())
      .sort((a, b) => (b.predicted_rating * b.confidence) - (a.predicted_rating * a.confidence))
      .slice(0, limit);
  }

  private applyDiversityFilters(
    recommendations: CollaborativeRecommendation[],
    context: RecommendationContext
  ): CollaborativeRecommendation[] {
    
    // Implementar lógica de diversidade similar à Fase 1
    // Por enquanto, retornar as recomendações como estão
    return recommendations;
  }

  // MÉTODOS DE DADOS (Mock - implementar com banco real)

  private async findSimilarUsers(userId: string, limit: number): Promise<UserSimilarity[]> {
    // Mock - implementar busca real no banco
    return [
      {
        user_a: userId,
        user_b: 'user_similar_1',
        similarity_score: 0.85,
        common_items: 12,
        jaccard_index: 0.75,
        cosine_similarity: 0.82,
        calculated_at: new Date().toISOString()
      }
    ];
  }

  private async findSimilarItems(itemId: string, limit: number): Promise<ItemSimilarity[]> {
    // Mock - implementar busca real no banco
    return [
      {
        item_a: itemId,
        item_b: 'item_similar_1',
        similarity_score: 0.78,
        common_users: 25,
        confidence: 0.9,
        calculated_at: new Date().toISOString()
      }
    ];
  }

  private async getUserInteractions(userId: string): Promise<UserInteraction[]> {
    // Mock - implementar busca real no banco
    return [
      {
        user_id: userId,
        item_id: 'challenge_1',
        interaction_type: 'completou',
        rating: 5,
        timestamp: new Date().toISOString(),
        context: 'home'
      }
    ];
  }

  private async getItemsFromSimilarUsers(
    similarUsers: UserSimilarity[],
    context: RecommendationContext
  ): Promise<{ item_id: string; users: string[] }[]> {
    // Mock - implementar lógica real
    return [
      { item_id: 'challenge_2', users: ['user_similar_1'] }
    ];
  }

  private async getUsersWhoInteractedWith(itemId: string): Promise<string[]> {
    // Mock - implementar busca real
    return ['user1', 'user2', 'user3'];
  }

  private async getActiveUsers(): Promise<string[]> {
    // Mock - implementar busca real (usuários com >5 interações nos últimos 30 dias)
    return ['user1', 'user2', 'user3'];
  }

  private async getPopularItems(): Promise<string[]> {
    // Mock - implementar busca real (itens com >10 interações)
    return ['challenge_1', 'article_1', 'recipe_1'];
  }

  private async getFallbackRecommendations(
    context: RecommendationContext,
    limit: number
  ): Promise<CollaborativeRecommendation[]> {
    
    // Fallback para recomendações populares
    return [
      {
        item_id: 'popular_1',
        predicted_rating: 4.0,
        confidence: 0.5,
        reasoning: {
          similar_users: [],
          similar_items: [],
          interaction_patterns: ['Recomendação popular (fallback)']
        },
        source: 'item_based'
      }
    ];
  }

  private async saveUserSimilarity(similarity: UserSimilarity): Promise<void> {
    console.log(`💾 Saving user similarity: ${similarity.user_a} <-> ${similarity.user_b} (${similarity.similarity_score.toFixed(3)})`);
  }

  private async saveItemSimilarity(similarity: ItemSimilarity): Promise<void> {
    console.log(`💾 Saving item similarity: ${similarity.item_a} <-> ${similarity.item_b} (${similarity.similarity_score.toFixed(3)})`);
  }
}

export default CollaborativeFilteringService;
