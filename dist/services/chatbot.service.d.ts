export declare class ChatbotService {
    static processQuery(query: string): Promise<{
        content: string;
        charts: {
            type: string;
            data: {
                label: string;
                value: string;
                change: string;
                positive: boolean;
            };
        }[];
        actions?: undefined;
    } | {
        content: string;
        actions: {
            label: string;
            action: string;
            data: string;
        }[];
        charts?: undefined;
    } | {
        content: string;
        charts?: undefined;
        actions?: undefined;
    } | {
        content: string;
        charts: any[];
        actions: any[];
    }>;
    private static processQuerySimple;
    static processPartnerQuery(query: string, userId: string): Promise<{
        content: string;
    } | {
        content: string;
        charts: any[];
        actions: any[];
    }>;
    private static processPartnerQuerySimple;
}
//# sourceMappingURL=chatbot.service.d.ts.map