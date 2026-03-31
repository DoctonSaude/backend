import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';

const router = Router();

// Validação para eventos de analytics
const analyticsValidation = [
  body('event').notEmpty().withMessage('Event é obrigatório'),
  body('properties').optional().isObject(),
];

// Rota simplificada para analytics - apenas log sem salvar no banco
router.post('/track', analyticsValidation, async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { event, properties, userId, timestamp } = req.body;
    
    // Apenas log do evento sem salvar no banco
    console.log(`[Analytics] Event: ${event}`, {
      userId: userId || 'anonymous',
      timestamp: timestamp || new Date(),
      properties: properties || {}
    });
    
    // Resposta de sucesso
    res.status(200).json({
      success: true,
      message: 'Event tracked successfully (logged only)',
      event,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Analytics] Error tracking event:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to track event'
    });
  }
});

// Rota simplificada para batch analytics
router.post('/track-batch', analyticsValidation, async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { events } = req.body;
    
    if (!Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        error: 'Events must be an array'
      });
    }
    
    // Log de todos os eventos sem salvar no banco
    events.forEach((eventData, index) => {
      console.log(`[Analytics Batch ${index + 1}] Event: ${eventData.event}`, {
        userId: eventData.userId || 'anonymous',
        timestamp: eventData.timestamp || new Date(),
        properties: eventData.properties || {}
      });
    });
    
    res.status(200).json({
      success: true,
      message: `${events.length} events tracked successfully (logged only)`,
      count: events.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Analytics] Error tracking batch events:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to track batch events'
    });
  }
});

export default router;
