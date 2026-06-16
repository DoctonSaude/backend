import { promises as fs } from 'fs';
import { join } from 'path';
import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import prisma from '../lib/prisma.js';
import { PEDOMED_CONFIG } from '../config/pedomed.config.js';
import { DrugMatchingService } from './drug-matching.service.js';
import { ChatbotService } from './chatbot.service.js';
import OpenAI from 'openai';

function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (key) return new OpenAI({ apiKey: key });
  return null;
}

export class OCRService {
    drugMatchingService: DrugMatchingService;
    constructor() {
        this.drugMatchingService = new DrugMatchingService();
    }
    /**
     * Processa imagem para extração de texto e medicamentos
     */
    async processImage(params) {
        const startTime = Date.now();
        let ocrProcessing = null;
        try {
            // 1. Validar imagem
            await this.validateImage(params.imageBuffer, params.mimeType);
            // 2. Criar registro de processamento
            ocrProcessing = await (prisma as any).oCRProcessing.create({
                data: {
                    userId: params.userId,
                    originalImageUrl: await this.saveOriginalImage(params.imageBuffer, params.originalFilename),
                    extractedText: '',
                    confidence: 0,
                    processingTimeMs: 0,
                    status: 'PROCESSING',
                    metadata: {
                        fileSize: params.imageBuffer.length,
                        dimensions: await this.getImageDimensions(params.imageBuffer),
                        format: params.mimeType,
                    }
                }
            });
            // 3. Pré-processar imagem
            const processedImageBuffer = await this.preprocessImage(params.imageBuffer);
            ocrProcessing.processedImageUrl = await this.saveProcessedImage(processedImageBuffer, ocrProcessing.id);
            // 4. Extrair texto com OCR
            const { text, confidence } = await this.extractText(processedImageBuffer);
            // 5. Extrair medicamentos do texto
            const detectedDrugs = await this.extractDrugs(text);
            
            // 5.5 Ana IA (Interpretação Clínica Simplificada)
            let anaInterpretation = null;
            if (params.type === 'EXAM' || text.toLowerCase().includes('exame') || text.toLowerCase().includes('laudo')) {
               anaInterpretation = await this.analyzeExamWithAna(text);
            }

            // 6. Atualizar registro com resultados
            const processingTime = Date.now() - startTime;
            const updatedProcessing = await (prisma as any).oCRProcessing.update({
                where: { id: ocrProcessing.id },
                data: {
                    extractedText: text,
                    confidence,
                    processingTimeMs: processingTime,
                    status: 'COMPLETED',
                    metadata: {
                        ...ocrProcessing.metadata,
                        anaInterpretation
                    },
                    detectedDrugs: {
                        create: detectedDrugs
                    }
                },
                include: {
                    detectedDrugs: true
                }
            });
            console.log(`[OCRService] Processing completed in ${processingTime}ms with ${detectedDrugs.length} drugs detected`);
            return updatedProcessing;
        }
        catch (error) {
            console.error('[OCRService] Processing error:', error);
            // Atualizar com erro
            if (ocrProcessing) {
                await (prisma as any).oCRProcessing.update({
                    where: { id: ocrProcessing.id },
                    data: {
                        status: 'FAILED',
                        errorMessage: error instanceof Error ? error.message : 'Unknown error',
                        processingTimeMs: Date.now() - startTime
                    }
                });
            }
            throw error;
        }
    }
    /**
     * Obtém dimensões da imagem
     */
    async getImageDimensions(imageBuffer: Buffer) {
        const metadata = await sharp(imageBuffer).metadata();
        return {
            width: metadata.width || 0,
            height: metadata.height || 0
        };
    }
    /**
     * Salva imagem processada
     */
    async saveProcessedImage(imageBuffer: Buffer, ocrId: string) {
        const uploadsDir = PEDOMED_CONFIG.OCR.STORAGE.LOCAL_PATH;
        await fs.mkdir(uploadsDir, { recursive: true });
        const filename = `processed_${ocrId}_${Date.now()}.jpg`;
        const filePath = join(uploadsDir, filename);
        await fs.writeFile(filePath, imageBuffer);
        return `/uploads/ocr/${filename}`;
    }
    /**
     * Pré-processa imagem para melhorar OCR
     */
    async preprocessImage(imageBuffer: Buffer) {
        const config = PEDOMED_CONFIG.OCR.PROCESSING;
        let pipeline = sharp(imageBuffer);
        // Redimensionar se necessário
        if (config.RESIZE_ENABLED) {
            pipeline = pipeline.resize(config.MAX_WIDTH, config.MAX_HEIGHT, {
                fit: 'inside',
                withoutEnlargement: true
            });
        }
        // Converter para grayscale
        pipeline = pipeline.grayscale();
        // Melhorar contraste
        if (config.ENHANCE_CONTRAST) {
            pipeline = pipeline.normalize();
        }
        // Remover ruído
        if (config.REMOVE_NOISE) {
            pipeline = pipeline.sharpen(1, 1.5, 2.0);
        }
        // Binarizar (preto e branco)
        if (config.BINARIZE) {
            pipeline = (pipeline as any).threshold(128);
        }
        return await pipeline.jpeg({ quality: 90 }).toBuffer();
    }
    /**
     * Extrai texto usando Tesseract OCR
     */
    async extractText(imageBuffer: Buffer) {
        const languages = ['por', 'eng'] as any;
        const worker = await createWorker(languages, 1, {
            logger: (m) => {
                if (m.status === 'recognizing text') {
                    console.log(`[OCRService] Tesseract progress: ${Math.round((m.progress || 0) * 100)}%`);
                }
            }
        });
        try {
            const { data: { text, confidence } } = await (worker as any).recognize(imageBuffer);
            // Limpar texto
            const cleanedText = this.cleanExtractedText(text);
            return {
                text: cleanedText,
                confidence: confidence / 100 // Converter para 0-1
            };
        }
        finally {
            await (worker as any).terminate();
        }
    }
    /**
     * Limpa e normaliza texto extraído
     */
    cleanExtractedText(text: string) {
        return text
            // Remover múltiplos espaços
            .replace(/\s+/g, ' ')
            // Remover quebras de linha excessivas
            .replace(/\n\s*\n/g, '\n')
            // Remover caracteres especiais problemáticos (regex corrigido)
            .replace(/[^\w\sáéíóúâêîôûãõàèìòùçÁÉÍÓÚÂÊÎÔÛÃÕÀÈÌÒÙÇºª°%.,\-+*/=()]/g, '')
            // Trim
            .trim();
    }
    /**
     * Valida imagem antes do processamento
     */
    async validateImage(imageBuffer: Buffer, mimeType: string) {
        // Verificar tamanho
        if (imageBuffer.length > PEDOMED_CONFIG.OCR.MAX_FILE_SIZE) {
            throw new Error(`Image too large. Maximum size: ${PEDOMED_CONFIG.OCR.MAX_FILE_SIZE / 1024 / 1024}MB`);
        }
        // Verificar formato
        const allowedFormats = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedFormats.includes(mimeType)) {
            throw new Error(`Unsupported format: ${mimeType}`);
        }
        // Verificar dimensões
        const metadata = await sharp(imageBuffer).metadata();
        const { width, height } = metadata;
        if (!width || !height) {
            throw new Error('Could not determine image dimensions');
        }
        const { MIN_IMAGE_WIDTH, MIN_IMAGE_HEIGHT, MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT } = PEDOMED_CONFIG.OCR.QUALITY_CHECKS;
        if (width < MIN_IMAGE_WIDTH || height < MIN_IMAGE_HEIGHT) {
            throw new Error(`Image too small. Minimum: ${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT}`);
        }
        if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT) {
            throw new Error(`Image too large. Maximum: ${MAX_IMAGE_WIDTH}x${MAX_IMAGE_HEIGHT}`);
        }
    }
    /**
     * Salva imagem original
     */
    async saveOriginalImage(imageBuffer: Buffer, filename: string) {
        const uploadsDir = join(PEDOMED_CONFIG.OCR.STORAGE.LOCAL_PATH, 'original');
        await fs.mkdir(uploadsDir, { recursive: true });
        const finalFilename = `${Date.now()}_${filename}`;
        const filePath = join(uploadsDir, finalFilename);
        await fs.writeFile(filePath, imageBuffer);
        return `/uploads/ocr/original/${finalFilename}`;
    }

    /**
     * Ana IA: Analisa texto de exames/laudos
     */
    async analyzeExamWithAna(text: string) {
        const openai = getOpenAI();
        if (!openai) return { summary: "Análise Ana IA indisponível. OCR cru extraído.", alerts: [] };

        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    { 
                        role: "system", 
                        content: "Você é Ana, a IA Especialista Clínica da Docton Saúde. Seu papel é receber textos OCR de exames e laudos, identificar valores anormais críticos e resumir de forma que um médico possa bater o olho e entender. Retorne um JSON com { summary: string, alerts: string[] }." 
                    },
                    { role: "user", content: `Analise este texto de exame:\n${text.substring(0, 3000)}` }
                ],
                response_format: { type: "json_object" }
            });

            return JSON.parse(response.choices[0]?.message?.content || '{}');
        } catch (e) {
            console.error("[OCRService] Erro na Ana IA:", e);
            return { summary: "Erro ao processar análise da Ana IA.", alerts: [] };
        }
    }

    /**
     * Extrai medicamentos do texto
     */
    async extractDrugs(text: string) {
        const drugs: any[] = [];
        const config = PEDOMED_CONFIG.OCR.DRUG_EXTRACTION;
        if (!config.ENABLED) {
            return drugs;
        }
        // 1. Extrair usando padrões regex
        for (const pattern of config.PATTERNS) {
            let match;
            const regex = new RegExp(pattern.source, pattern.flags);
            while ((match = regex.exec(text)) !== null) {
                let drugName: string;
                let dosage: string;
                let quantity: string = '1';
                // Filtro básico de qualidade
                if (config.BLACKLIST.some((word: any) => drugName.toLowerCase().includes(word.toLowerCase()))) {
                    continue;
                }
                // Usar Drug Matching para encontrar produto
                let matchedProduct = null;
                let matchType = 'NONE';
                let confidence = 0.7; // Confiança base do regex
                if (config.USE_DRUG_MATCHING) {
                    try {
                        const searchResults = await this.drugMatchingService.searchDrugs({
                            query: drugName,
                            maxResults: 1
                        });
                        if (searchResults.length > 0) {
                            matchedProduct = searchResults[0];
                            matchType = (searchResults[0] as any).matchType;
                            confidence = Math.min(confidence, (searchResults[0] as any).confidence);
                        }
                    }
                    catch (error) {
                        console.warn('[OCRService] Drug matching error:', error);
                    }
                }
                // Adicionar apenas se passar no threshold
                if (confidence >= config.MIN_DRUG_CONFIDENCE) {
                    drugs.push({
                        productId: matchedProduct?.productId,
                        rawText: match[0],
                        normalizedText: drugName,
                        confidence,
                        boundingBox: {
                            x: 0, // TODO: Implementar detecção de bounding box
                            y: 0,
                            width: 0,
                            height: 0
                        },
                        quantity,
                        dosage,
                        matchType,
                        userConfirmed: false
                    });
                }
            }
        }
        // Limitar número de medicamentos
        return drugs.slice(0, PEDOMED_CONFIG.OCR.VALIDATION.MAX_DETECTED_DRUGS);
    }
    /**
     * Limpa nome do medicamento
     */
    cleanDrugName(name: string) {
        return name
            .replace(/^\d+/, '') // Remover números no início
            .replace(/\d+$/, '') // Remover números no final
            .replace(/[^\w\sáéíóúâêîôûãõàèìòùçÁÉÍÓÚÂÊÎÔÛÃÕÀÈÌÒÙÇ]/g, '') // Remover caracteres especiais
            .replace(/\s+/g, ' ') // Normalizar espaços
            .trim();
    }
    /**
     * Obtém métricas de qualidade do OCR
     */
    async getQualityMetrics(days = 30) {
        // TODO: Implementar quando Prisma client for regenerado
        console.log('[OCRService] Quality metrics simulated - waiting for Prisma client regeneration');
        return {
            totalProcessed: 0,
            successfulExtractions: 0,
            averageConfidence: 0,
            averageProcessingTime: 0,
            topDetectedDrugs: [],
            processingErrors: []
        };
    }
    /**
     * Obtém processamento por ID
     */
    async getProcessingById(id: string, userId: string) {
        // TODO: Implementar quando Prisma client for regenerado
        console.log('[OCRService] Get processing by ID simulated - waiting for Prisma client regeneration');
        return null;
    }
    /**
     * Confirma medicamento detectado pelo usuário
     */
    async confirmDetectedDrug(detectedDrugId: string, userId: string) {
        // TODO: Implementar quando Prisma client for regenerado
        console.log('[OCRService] Confirm detected drug simulated - waiting for Prisma client regeneration');
    }
    /**
     * Rejeita medicamento detectado pelo usuário
     */
    async rejectDetectedDrug(detectedDrugId: string, userId: string) {
        // TODO: Implementar quando Prisma client for regenerado
        console.log('[OCRService] Reject detected drug simulated - waiting for Prisma client regeneration');
    }
}
