import { DrugMatchingService } from './drug-matching.service.js';
export declare class OCRService {
    drugMatchingService: DrugMatchingService;
    constructor();
    /**
     * Processa imagem para extração de texto e medicamentos
     */
    processImage(params: any): Promise<any>;
    /**
     * Obtém dimensões da imagem
     */
    getImageDimensions(imageBuffer: Buffer): Promise<{
        width: any;
        height: any;
    }>;
    /**
     * Salva imagem processada
     */
    saveProcessedImage(imageBuffer: Buffer, ocrId: string): Promise<string>;
    /**
     * Pré-processa imagem para melhorar OCR
     */
    preprocessImage(imageBuffer: Buffer): Promise<any>;
    /**
     * Extrai texto usando Tesseract OCR
     */
    extractText(imageBuffer: Buffer): Promise<{
        text: string;
        confidence: number;
    }>;
    /**
     * Limpa e normaliza texto extraído
     */
    cleanExtractedText(text: string): string;
    /**
     * Valida imagem antes do processamento
     */
    validateImage(imageBuffer: Buffer, mimeType: string): Promise<void>;
    /**
     * Salva imagem original
     */
    saveOriginalImage(imageBuffer: Buffer, filename: string): Promise<string>;
    /**
     * Extrai medicamentos do texto
     */
    extractDrugs(text: string): Promise<any[]>;
    /**
     * Limpa nome do medicamento
     */
    cleanDrugName(name: string): string;
    /**
     * Obtém métricas de qualidade do OCR
     */
    getQualityMetrics(days?: number): Promise<{
        totalProcessed: number;
        successfulExtractions: number;
        averageConfidence: number;
        averageProcessingTime: number;
        topDetectedDrugs: any[];
        processingErrors: any[];
    }>;
    /**
     * Obtém processamento por ID
     */
    getProcessingById(id: string, userId: string): Promise<any>;
    /**
     * Confirma medicamento detectado pelo usuário
     */
    confirmDetectedDrug(detectedDrugId: string, userId: string): Promise<void>;
    /**
     * Rejeita medicamento detectado pelo usuário
     */
    rejectDetectedDrug(detectedDrugId: string, userId: string): Promise<void>;
}
//# sourceMappingURL=ocr.service.d.ts.map