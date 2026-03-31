"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const auth_1 = require("../middleware/auth");
const slugify_1 = __importDefault(require("slugify"));
const router = (0, express_1.Router)();
// Listar categorias da Base de Conhecimento
router.get('/categories', async (req, res) => {
    try {
        const categories = await prisma_js_1.default.knowledgeBaseCategory.findMany({
            include: {
                _count: {
                    select: { articles: true }
                }
            },
            orderBy: { name: 'asc' }
        });
        return res.json(categories);
    }
    catch (error) {
        console.error('Erro ao listar categorias KB:', error);
        return res.status(500).json({ error: 'Erro ao listar categorias' });
    }
});
// Listar artigos (opcionalmente por categoria)
router.get('/articles', async (req, res) => {
    try {
        const { categoryId, search } = req.query;
        const where = {
            status: 'PUBLISHED'
        };
        if (categoryId) {
            where.categoryId = String(categoryId);
        }
        if (search) {
            where.OR = [
                { title: { contains: String(search), mode: 'insensitive' } },
                { content: { contains: String(search), mode: 'insensitive' } },
                { tags: { has: String(search) } }
            ];
        }
        const articles = await prisma_js_1.default.knowledgeBaseArticle.findMany({
            where,
            include: {
                category: true
            },
            orderBy: { views: 'desc' }
        });
        return res.json(articles);
    }
    catch (error) {
        console.error('Erro ao listar artigos KB:', error);
        return res.status(500).json({ error: 'Erro ao listar artigos' });
    }
});
// Detalhes de um artigo
router.get('/articles/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const article = await prisma_js_1.default.knowledgeBaseArticle.findUnique({
            where: { slug },
            include: {
                category: true
            }
        });
        if (!article)
            return res.status(404).json({ error: 'Artigo não encontrado' });
        // Incrementar visualizações
        await prisma_js_1.default.knowledgeBaseArticle.update({
            where: { id: article.id },
            data: { views: { increment: 1 } }
        });
        return res.json(article);
    }
    catch (error) {
        console.error('Erro ao obter artigo KB:', error);
        return res.status(500).json({ error: 'Erro ao obter artigo' });
    }
});
// Marcar como útil/não útil
router.post('/articles/:id/vote', async (req, res) => {
    try {
        const { id } = req.params;
        const { type, helpful } = req.body;
        const field = type === 'notHelpful' ? 'notHelpful' : (type === 'helpful' || helpful === true ? 'helpful' : 'notHelpful');
        await prisma_js_1.default.knowledgeBaseArticle.update({
            where: { id },
            data: { [field]: { increment: 1 } }
        });
        return res.json({ success: true });
    }
    catch (error) {
        console.error('Erro ao votar no artigo KB:', error);
        return res.status(500).json({ error: 'Erro ao registrar voto' });
    }
});
// ==============================================================================
// ADMIN CRUD OPERATIONS
// ==============================================================================
// Criar Artigo
router.post('/articles', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const { title, content, categoryId, tags, status } = req.body;
        if (!title || !content || !categoryId) {
            return res.status(400).json({ error: 'Título, conteúdo e categoria são obrigatórios' });
        }
        const slug = (0, slugify_1.default)(title, { lower: true, strict: true });
        const article = await prisma_js_1.default.knowledgeBaseArticle.create({
            data: {
                title,
                content,
                slug,
                categoryId,
                tags: tags || [],
                status: status || 'PUBLISHED',
                views: 0,
                helpful: 0,
                notHelpful: 0
            }
        });
        return res.status(201).json(article);
    }
    catch (error) {
        console.error('Erro ao criar artigo KB:', error);
        return res.status(500).json({ error: 'Erro ao criar artigo' });
    }
});
// Atualizar Artigo
router.put('/articles/:id', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, categoryId, tags, status } = req.body;
        const data = {};
        if (title) {
            data.title = title;
            data.slug = (0, slugify_1.default)(title, { lower: true, strict: true });
        }
        if (content)
            data.content = content;
        if (categoryId)
            data.categoryId = categoryId;
        if (tags)
            data.tags = tags;
        if (status)
            data.status = status;
        const article = await prisma_js_1.default.knowledgeBaseArticle.update({
            where: { id },
            data
        });
        return res.json(article);
    }
    catch (error) {
        console.error('Erro ao atualizar artigo KB:', error);
        return res.status(500).json({ error: 'Erro ao atualizar artigo' });
    }
});
// Excluir Artigo
router.delete('/articles/:id', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_js_1.default.knowledgeBaseArticle.delete({ where: { id } });
        return res.json({ success: true });
    }
    catch (error) {
        console.error('Erro ao excluir artigo KB:', error);
        return res.status(500).json({ error: 'Erro ao excluir artigo' });
    }
});
// Criar Categoria
router.post('/categories', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const { name } = req.body;
        if (!name)
            return res.status(400).json({ error: 'Nome é obrigatório' });
        const slug = (0, slugify_1.default)(name, { lower: true, strict: true });
        const category = await prisma_js_1.default.knowledgeBaseCategory.create({
            data: { name, slug }
        });
        return res.status(201).json(category);
    }
    catch (error) {
        console.error('Erro ao criar categoria KB:', error);
        return res.status(500).json({ error: 'Erro ao criar categoria' });
    }
});
exports.default = router;
//# sourceMappingURL=knowledge.routes.js.map