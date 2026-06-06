"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const auth_js_1 = require("../../middleware/auth.js");
const prisma_js_1 = __importDefault(require("../../lib/prisma.js"));
const router = (0, express_1.Router)();
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [auth_js_1.authenticate, (0, auth_js_1.authorize)('ADMIN')];
// --- Contact Messages ---
/**
 * @route GET /api/admin/contact-messages
 */
router.get('/contact-messages', ...adminAuth, async (req, res) => {
    try {
        const messages = await prisma_js_1.default.contactMessage.findMany({ orderBy: { createdAt: 'desc' } });
        if (messages.length === 0) {
            // Mock para UI se vazio
            return res.json([
                { id: '1', name: 'João Silva', email: 'joao@email.com', phone: '11999999999', message: 'Dúvida sobre planos', createdAt: new Date().toISOString(), read: false },
                { id: '2', name: 'Maria Santos', email: 'maria@email.com', phone: '11888888888', message: 'Agendamento', createdAt: new Date(Date.now() - 3600000).toISOString(), read: true }
            ]);
        }
        return res.json(messages);
    }
    catch (error) {
        res.json([]);
    }
});
/**
 * @route PUT /api/admin/contact-messages/:id
 */
router.put('/contact-messages/:id', ...adminAuth, async (req, res) => {
    try {
        const updated = await prisma_js_1.default.contactMessage.update({
            where: { id: req.params.id },
            data: { read: req.body.read }
        });
        return res.json(updated);
    }
    catch (error) {
        res.status(404).json({ error: 'Mensagem não encontrada' });
    }
});
// --- Interactive Videos ---
/**
 * @route GET /api/admin/videos
 */
router.get('/videos', ...adminAuth, async (req, res) => {
    try {
        const videos = await prisma_js_1.default.videoContent.findMany({ orderBy: { createdAt: 'desc' } });
        return res.json(videos);
    }
    catch (error) {
        res.json([]);
    }
});
/**
 * @route POST /api/admin/videos
 */
router.post('/videos', ...adminAuth, async (req, res) => {
    try {
        const video = await prisma_js_1.default.videoContent.create({ data: req.body });
        return res.status(201).json(video);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao criar vídeo' });
    }
});
// --- Blog Posts ---
/**
 * @route GET /api/admin/blog/posts
 */
router.get('/blog/posts', ...adminAuth, async (req, res) => {
    try {
        const posts = await prisma_js_1.default.blogPost.findMany({ orderBy: { createdAt: 'desc' } });
        return res.json(posts);
    }
    catch (error) {
        console.error('Error fetching blog posts:', error);
        res.json([]);
    }
});
/**
 * @route POST /api/admin/blog/posts
 */
router.post('/blog/posts', ...adminAuth, async (req, res) => {
    try {
        const post = await prisma_js_1.default.blogPost.create({ data: req.body });
        return res.status(201).json(post);
    }
    catch (error) {
        console.error('Error creating blog post:', error);
        res.status(500).json({ error: 'Erro ao criar post' });
    }
});
/**
 * @route PUT /api/admin/blog/posts/:id
 */
router.put('/blog/posts/:id', ...adminAuth, async (req, res) => {
    try {
        const post = await prisma_js_1.default.blogPost.update({
            where: { id: req.params.id },
            data: req.body
        });
        return res.json(post);
    }
    catch (error) {
        res.status(404).json({ error: 'Post não encontrado' });
    }
});
/**
 * @route DELETE /api/admin/blog/posts/:id
 */
router.delete('/blog/posts/:id', ...adminAuth, async (req, res) => {
    try {
        await prisma_js_1.default.blogPost.delete({ where: { id: req.params.id } });
        return res.json({ success: true });
    }
    catch (error) {
        res.status(404).json({ error: 'Post não encontrado' });
    }
});
/**
 * @route POST /api/admin/blog/posts/:id/view
 * Público ou Admin - Incrementa visualização
 */
router.post('/blog/posts/:id/view', async (req, res) => {
    try {
        const post = await prisma_js_1.default.blogPost.update({
            where: { id: req.params.id },
            data: { views: { increment: 1 } }
        });
        return res.json({ views: post.views });
    }
    catch (error) {
        res.status(404).json({ error: 'Post não encontrado' });
    }
});
exports.default = router;
//# sourceMappingURL=content.routes.js.map