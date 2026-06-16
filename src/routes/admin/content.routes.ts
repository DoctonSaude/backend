// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';
import multer from 'multer';
import { storageService } from '../../services/storage.service.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [authenticate, authorize('ADMIN')];

// --- Contact Messages ---

/**
 * @route GET /api/admin/contact-messages
 */
router.get('/contact-messages', ...adminAuth, async (req, res) => {
  try {
    const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } });
    if (messages.length === 0) {
      // Mock para UI se vazio
      return res.json([
        { id: '1', name: 'João Silva', email: 'joao@email.com', phone: '11999999999', message: 'Dúvida sobre planos', createdAt: new Date().toISOString(), read: false },
        { id: '2', name: 'Maria Santos', email: 'maria@email.com', phone: '11888888888', message: 'Agendamento', createdAt: new Date(Date.now() - 3600000).toISOString(), read: true }
      ]);
    }
    return res.json(messages);
  } catch (error) {
    res.json([]);
  }
});

/**
 * @route PUT /api/admin/contact-messages/:id
 */
router.put('/contact-messages/:id', ...adminAuth, async (req, res) => {
  try {
    const updated = await prisma.contactMessage.update({
      where: { id: req.params.id },
      data: { read: req.body.read }
    });
    return res.json(updated);
  } catch (error) {
    res.status(404).json({ error: 'Mensagem não encontrada' });
  }
});

// --- Interactive Videos ---

/**
 * @route GET /api/admin/videos
 */
router.get('/videos', ...adminAuth, async (req, res) => {
  try {
    const videos = await prisma.videoContent.findMany({ orderBy: { createdAt: 'desc' } });
    return res.json(videos);
  } catch (error) {
    res.json([]);
  }
});

/**
 * @route POST /api/admin/videos/upload
 */
router.post('/videos/upload', ...adminAuth, upload.single('video'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum vídeo enviado' });
    }
    const publicUrl = await storageService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'videos'
    );
    return res.json({ url: publicUrl });
  } catch (error) {
    console.error('Error uploading video:', error);
    return res.status(500).json({ error: 'Erro no upload do vídeo' });
  }
});

/**
 * @route POST /api/admin/videos
 */
router.post('/videos', ...adminAuth, async (req, res) => {
  try {
    const video = await prisma.videoContent.create({ data: req.body });
    return res.status(201).json(video);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar vídeo' });
  }
});

/**
 * @route PUT /api/admin/videos/:id
 */
router.put('/videos/:id', ...adminAuth, async (req, res) => {
  try {
    const video = await prisma.videoContent.update({
      where: { id: req.params.id },
      data: req.body
    });
    return res.json(video);
  } catch (error) {
    res.status(404).json({ error: 'Vídeo não encontrado' });
  }
});

/**
 * @route DELETE /api/admin/videos/:id
 */
router.delete('/videos/:id', ...adminAuth, async (req, res) => {
  try {
    await prisma.videoContent.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (error) {
    res.status(404).json({ error: 'Vídeo não encontrado' });
  }
});

// --- Blog Posts ---

/**
 * @route GET /api/admin/blog/posts
 */
router.get('/blog/posts', ...adminAuth, async (req, res) => {
  try {
    const posts = await prisma.blogPost.findMany({ orderBy: { createdAt: 'desc' } });
    return res.json(posts);
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    res.json([]);
  }
});

/**
 * @route POST /api/admin/blog/posts/image
 */
router.post('/blog/posts/image', ...adminAuth, upload.single('image'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    }
    const publicUrl = await storageService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'blog'
    );
    return res.json({ url: publicUrl });
  } catch (error) {
    console.error('Error uploading blog image:', error);
    return res.status(500).json({ error: 'Erro no upload da imagem' });
  }
});

/**
 * @route POST /api/admin/blog/posts
 */
router.post('/blog/posts', ...adminAuth, async (req, res) => {
  try {
    const post = await prisma.blogPost.create({ data: req.body });
    return res.status(201).json(post);
  } catch (error) {
    console.error('Error creating blog post:', error);
    res.status(500).json({ error: 'Erro ao criar post' });
  }
});

/**
 * @route PUT /api/admin/blog/posts/:id
 */
router.put('/blog/posts/:id', ...adminAuth, async (req, res) => {
  try {
    const post = await prisma.blogPost.update({
      where: { id: req.params.id },
      data: req.body
    });
    return res.json(post);
  } catch (error) {
    res.status(404).json({ error: 'Post não encontrado' });
  }
});

/**
 * @route DELETE /api/admin/blog/posts/:id
 */
router.delete('/blog/posts/:id', ...adminAuth, async (req, res) => {
  try {
    await prisma.blogPost.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (error) {
    res.status(404).json({ error: 'Post não encontrado' });
  }
});

/**
 * @route POST /api/admin/blog/posts/:id/view
 * Público ou Admin - Incrementa visualização
 */
router.post('/blog/posts/:id/view', async (req, res) => {
  try {
    const post = await prisma.blogPost.update({
      where: { id: req.params.id },
      data: { views: { increment: 1 } }
    });
    return res.json({ views: post.views });
  } catch (error) {
    res.status(404).json({ error: 'Post não encontrado' });
  }
});

// --- AiInsights ---

/**
 * @route GET /api/admin/content/ai-insights
 */
router.get('/ai-insights', ...adminAuth, async (req, res) => {
  try {
    const insights = await prisma.aiInsight.findMany({ orderBy: { priority: 'asc' } });
    return res.json(insights);
  } catch (error) {
    console.error('Error fetching AI Insights:', error);
    res.json([]);
  }
});

/**
 * @route POST /api/admin/content/ai-insights
 */
router.post('/ai-insights', ...adminAuth, async (req, res) => {
  try {
    const insight = await prisma.aiInsight.create({ data: req.body });
    return res.status(201).json(insight);
  } catch (error) {
    console.error('Error creating AI Insight:', error);
    res.status(500).json({ error: 'Erro ao criar AI Insight' });
  }
});

/**
 * @route PUT /api/admin/content/ai-insights/:id
 */
router.put('/ai-insights/:id', ...adminAuth, async (req, res) => {
  try {
    const insight = await prisma.aiInsight.update({
      where: { id: req.params.id },
      data: req.body
    });
    return res.json(insight);
  } catch (error) {
    res.status(404).json({ error: 'AI Insight não encontrado' });
  }
});

/**
 * @route DELETE /api/admin/content/ai-insights/:id
 */
router.delete('/ai-insights/:id', ...adminAuth, async (req, res) => {
  try {
    await prisma.aiInsight.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (error) {
    res.status(404).json({ error: 'AI Insight não encontrado' });
  }
});

// --- Automated Reports ---

/**
 * @route GET /api/admin/content/automated-reports
 */
router.get('/automated-reports', ...adminAuth, async (req, res) => {
  try {
    const reports = await prisma.automatedReport.findMany({ orderBy: { createdAt: 'desc' } });
    return res.json(reports);
  } catch (error) {
    console.error('Error fetching automated reports:', error);
    res.json([]);
  }
});

/**
 * @route POST /api/admin/content/automated-reports
 */
router.post('/automated-reports', ...adminAuth, async (req, res) => {
  try {
    const report = await prisma.automatedReport.create({ data: req.body });
    return res.status(201).json(report);
  } catch (error) {
    console.error('Error creating automated report:', error);
    res.status(500).json({ error: 'Erro ao criar automated report' });
  }
});

/**
 * @route PUT /api/admin/content/automated-reports/:id
 */
router.put('/automated-reports/:id', ...adminAuth, async (req, res) => {
  try {
    const report = await prisma.automatedReport.update({
      where: { id: req.params.id },
      data: req.body
    });
    return res.json(report);
  } catch (error) {
    res.status(404).json({ error: 'Automated report não encontrado' });
  }
});

/**
 * @route DELETE /api/admin/content/automated-reports/:id
 */
router.delete('/automated-reports/:id', ...adminAuth, async (req, res) => {
  try {
    await prisma.automatedReport.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (error) {
    res.status(404).json({ error: 'Automated report não encontrado' });
  }
});

export default router;
