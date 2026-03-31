import { Router } from 'express';
import multer from 'multer';
import { OCRService } from '../services/ocr.service.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const ocrService = new OCRService();

// Configuração do Multer para upload de imagens
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error(`Unsupported file type: ${file.mimetype}`));
        }
    }
});

/**
 * POST /api/ocr/upload
 * Faz o upload de uma imagem de receita e inicia o processamento OCR
 */
router.post('/upload', authenticate, upload.single('image'), async (req: any, res: any) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No image file provided'
            });
        }
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }
        const { buffer: imageBuffer, originalname, mimetype } = req.file;
        console.log(`[OCR Routes] Processing image for user ${userId}: ${originalname}`);
        const result = await ocrService.processImage({
            imageBuffer,
            userId,
            originalFilename: originalname,
            mimeType: mimetype
        });
        res.json({
            success: true,
            data: {
                id: result.id,
                status: result.status,
                extractedText: result.extractedText,
                confidence: result.confidence,
                processingTimeMs: result.processingTimeMs,
                detectedDrugs: (result.detectedDrugs || []).map((drug: any) => ({
                    id: drug.id,
                    rawText: drug.rawText,
                    normalizedText: drug.normalizedText,
                    confidence: drug.confidence,
                    matchType: drug.matchType,
                    quantity: drug.quantity,
                    dosage: drug.dosage,
                    productId: drug.productId,
                    userConfirmed: drug.userConfirmed
                })),
                originalImageUrl: result.originalImageUrl,
                processedImageUrl: result.processedImageUrl,
                createdAt: result.createdAt
            }
        });
    }
    catch (error) {
        console.error('[OCR Routes] Upload error:', error);
        if (error instanceof Error) {
            if (error.message.includes('too large')) {
                return res.status(413).json({
                    success: false,
                    error: 'Image too large'
                });
            }
            if (error.message.includes('Unsupported format')) {
                return res.status(400).json({
                    success: false,
                    error: error.message
                });
            }
        }
        res.status(500).json({
            success: false,
            error: 'Error processing image'
        });
    }
});

// GET /api/ocr/:id - Obtém resultado do processamento
router.get('/:id', authenticate, async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }
        const result = await ocrService.getProcessingById(id, userId);
        if (!result) {
            return res.status(404).json({
                success: false,
                error: 'OCR processing not found'
            });
        }
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('[OCR Routes] Get processing error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Error retrieving OCR processing'
        });
    }
});

/**
 * GET /api/ocr/stats
 * Obtém estatísticas de qualidade do OCR
 */
router.get('/stats', authenticate, async (req: any, res: any) => {
    try {
        const { days = 30 } = req.query;
        const metrics = await ocrService.getQualityMetrics(Number(days));
        res.json({
            success: true,
            data: metrics,
            period: `${days} days`
        });
    }
    catch (error) {
        console.error('[OCR Routes] Stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching OCR statistics'
        });
    }
});

export default router;
