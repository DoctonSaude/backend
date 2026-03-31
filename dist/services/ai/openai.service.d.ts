declare class OpenAIService {
    private client;
    private model;
    constructor();
    chat(messages: any[], options?: any): Promise<string>;
    chatStream(messages: any[], options?: any): AsyncGenerator<string, void, unknown>;
    /**
     * Create embeddings for RAG
     */
    createEmbedding(text: string): Promise<number[]>;
    /**
     * Moderate content
     */
    moderateContent(text: string): Promise<boolean>;
}
declare const _default: OpenAIService;
export default _default;
//# sourceMappingURL=openai.service.d.ts.map