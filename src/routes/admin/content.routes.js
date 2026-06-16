"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
var express_1 = require("express");
var auth_js_1 = require("../../middleware/auth.js");
var prisma_js_1 = require("../../lib/prisma.js");
var router = (0, express_1.Router)();
var adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [auth_js_1.authenticate, (0, auth_js_1.authorize)('ADMIN')];
// --- Contact Messages ---
/**
 * @route GET /api/admin/contact-messages
 */
router.get.apply(router, __spreadArray(__spreadArray(['/contact-messages'], adminAuth, false), [function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
        var messages, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, prisma_js_1.default.contactMessage.findMany({ orderBy: { createdAt: 'desc' } })];
                case 1:
                    messages = _a.sent();
                    if (messages.length === 0) {
                        // Mock para UI se vazio
                        return [2 /*return*/, res.json([
                                { id: '1', name: 'João Silva', email: 'joao@email.com', phone: '11999999999', message: 'Dúvida sobre planos', createdAt: new Date().toISOString(), read: false },
                                { id: '2', name: 'Maria Santos', email: 'maria@email.com', phone: '11888888888', message: 'Agendamento', createdAt: new Date(Date.now() - 3600000).toISOString(), read: true }
                            ])];
                    }
                    return [2 /*return*/, res.json(messages)];
                case 2:
                    error_1 = _a.sent();
                    res.json([]);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); }], false));
/**
 * @route PUT /api/admin/contact-messages/:id
 */
router.put.apply(router, __spreadArray(__spreadArray(['/contact-messages/:id'], adminAuth, false), [function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
        var updated, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, prisma_js_1.default.contactMessage.update({
                            where: { id: req.params.id },
                            data: { read: req.body.read }
                        })];
                case 1:
                    updated = _a.sent();
                    return [2 /*return*/, res.json(updated)];
                case 2:
                    error_2 = _a.sent();
                    res.status(404).json({ error: 'Mensagem não encontrada' });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); }], false));
// --- Interactive Videos ---
/**
 * @route GET /api/admin/videos
 */
router.get.apply(router, __spreadArray(__spreadArray(['/videos'], adminAuth, false), [function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
        var videos, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, prisma_js_1.default.videoContent.findMany({ orderBy: { createdAt: 'desc' } })];
                case 1:
                    videos = _a.sent();
                    return [2 /*return*/, res.json(videos)];
                case 2:
                    error_3 = _a.sent();
                    res.json([]);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); }], false));
/**
 * @route POST /api/admin/videos
 */
router.post.apply(router, __spreadArray(__spreadArray(['/videos'], adminAuth, false), [function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
        var video, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, prisma_js_1.default.videoContent.create({ data: req.body })];
                case 1:
                    video = _a.sent();
                    return [2 /*return*/, res.status(201).json(video)];
                case 2:
                    error_4 = _a.sent();
                    res.status(500).json({ error: 'Erro ao criar vídeo' });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); }], false));
/**
 * @route PUT /api/admin/videos/:id
 */
router.put.apply(router, __spreadArray(__spreadArray(['/videos/:id'], adminAuth, false), [function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
        var video, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, prisma_js_1.default.videoContent.update({
                            where: { id: req.params.id },
                            data: req.body
                        })];
                case 1:
                    video = _a.sent();
                    return [2 /*return*/, res.json(video)];
                case 2:
                    error_5 = _a.sent();
                    res.status(404).json({ error: 'Vídeo não encontrado' });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); }], false));
/**
 * @route DELETE /api/admin/videos/:id
 */
router.delete.apply(router, __spreadArray(__spreadArray(['/videos/:id'], adminAuth, false), [function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
        var error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, prisma_js_1.default.videoContent.delete({ where: { id: req.params.id } })];
                case 1:
                    _a.sent();
                    return [2 /*return*/, res.json({ success: true })];
                case 2:
                    error_6 = _a.sent();
                    res.status(404).json({ error: 'Vídeo não encontrado' });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); }], false));
// --- Blog Posts ---
/**
 * @route GET /api/admin/blog/posts
 */
router.get.apply(router, __spreadArray(__spreadArray(['/blog/posts'], adminAuth, false), [function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
        var posts, error_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, prisma_js_1.default.blogPost.findMany({ orderBy: { createdAt: 'desc' } })];
                case 1:
                    posts = _a.sent();
                    return [2 /*return*/, res.json(posts)];
                case 2:
                    error_7 = _a.sent();
                    console.error('Error fetching blog posts:', error_7);
                    res.json([]);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); }], false));
/**
 * @route POST /api/admin/blog/posts
 */
router.post.apply(router, __spreadArray(__spreadArray(['/blog/posts'], adminAuth, false), [function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
        var post, error_8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, prisma_js_1.default.blogPost.create({ data: req.body })];
                case 1:
                    post = _a.sent();
                    return [2 /*return*/, res.status(201).json(post)];
                case 2:
                    error_8 = _a.sent();
                    console.error('Error creating blog post:', error_8);
                    res.status(500).json({ error: 'Erro ao criar post' });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); }], false));
/**
 * @route PUT /api/admin/blog/posts/:id
 */
router.put.apply(router, __spreadArray(__spreadArray(['/blog/posts/:id'], adminAuth, false), [function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
        var post, error_9;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, prisma_js_1.default.blogPost.update({
                            where: { id: req.params.id },
                            data: req.body
                        })];
                case 1:
                    post = _a.sent();
                    return [2 /*return*/, res.json(post)];
                case 2:
                    error_9 = _a.sent();
                    res.status(404).json({ error: 'Post não encontrado' });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); }], false));
/**
 * @route DELETE /api/admin/blog/posts/:id
 */
router.delete.apply(router, __spreadArray(__spreadArray(['/blog/posts/:id'], adminAuth, false), [function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
        var error_10;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, prisma_js_1.default.blogPost.delete({ where: { id: req.params.id } })];
                case 1:
                    _a.sent();
                    return [2 /*return*/, res.json({ success: true })];
                case 2:
                    error_10 = _a.sent();
                    res.status(404).json({ error: 'Post não encontrado' });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); }], false));
/**
 * @route POST /api/admin/blog/posts/:id/view
 * Público ou Admin - Incrementa visualização
 */
router.post('/blog/posts/:id/view', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var post, error_11;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, prisma_js_1.default.blogPost.update({
                        where: { id: req.params.id },
                        data: { views: { increment: 1 } }
                    })];
            case 1:
                post = _a.sent();
                return [2 /*return*/, res.json({ views: post.views })];
            case 2:
                error_11 = _a.sent();
                res.status(404).json({ error: 'Post não encontrado' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
