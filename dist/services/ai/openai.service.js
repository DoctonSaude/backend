"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const openai_1 = __importDefault(require("openai"));
class OpenAIService {
    client;
    model;
    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
            this.client = new openai_1.default({
                apiKey: apiKey,
            });
        }
        this.model = process.env.OPENAI_MODEL || 'gpt-4o';
    }
    async chat(messages, options) {
        try {
            if (!this.client) {
                console.warn('OpenAI client not initialized. Check OPENAI_API_KEY.');
                return null;
            }
            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: messages,
                temperature: options?.temperature || 0.7,
                max_tokens: options?.maxTokens || 1000,
                stream: options?.stream || false,
            });
            return response.choices[0]?.message?.content || '';
        }
        catch (error) {
            console.error('OpenAI API error:', error);
            return null;
        }
    }
    async *chatStream(messages, options) {
        try {
            if (!this.client)
                throw new Error('OpenAI client not initialized');
            const stream = await this.client.chat.completions.create({
                model: this.model,
                messages: messages,
                temperature: options?.temperature || 0.7,
                max_tokens: options?.maxTokens || 1000,
                stream: true,
            });
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content;
                if (content) {
                    yield content;
                }
            }
        }
        catch (error) {
            console.error('OpenAI streaming error:', error);
            throw new Error('Failed to generate streaming response');
        }
    }
    /**
     * Create embeddings for RAG
     */
    async createEmbedding(text) {
        try {
            if (!this.client)
                throw new Error('OpenAI client not initialized');
            const response = await this.client.embeddings.create({
                model: 'text-embedding-3-small',
                input: text,
            });
            return response.data[0].embedding;
        }
        catch (error) {
            console.error('OpenAI embedding error:', error);
            throw new Error('Failed to create embedding');
        }
    }
    /**
     * Moderate content
     */
    async moderateContent(text) {
        try {
            if (!this.client)
                return true;
            const response = await this.client.moderations.create({
                input: text,
            });
            return !response.results[0].flagged;
        }
        catch (error) {
            console.error('OpenAI moderation error:', error);
            return true; // Allow by default if moderation fails
        }
    }
}
exports.default = new OpenAIService();
//# sourceMappingURL=openai.service.js.map