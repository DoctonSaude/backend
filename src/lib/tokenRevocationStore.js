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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureRuntimeDir = ensureRuntimeDir;
exports.getRevokedAt = getRevokedAt;
exports.setRevokedAt = setRevokedAt;
var promises_1 = require("fs/promises");
var path_1 = require("path");
var env_1 = require("../config/env");
var logger_1 = require("./logger");
var RUNTIME_DIR = path_1.default.resolve(process.cwd(), '.runtime');
var FILE_PATH = path_1.default.join(RUNTIME_DIR, 'tokenRevocation.json');
function ensureRuntimeDir() {
    return __awaiter(this, void 0, void 0, function () {
        var err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, promises_1.default.mkdir(RUNTIME_DIR, { recursive: true })];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    err_1 = _a.sent();
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function getRevokedAtFile() {
    return __awaiter(this, void 0, void 0, function () {
        var content, json, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, promises_1.default.readFile(FILE_PATH, 'utf8')];
                case 1:
                    content = _a.sent();
                    json = JSON.parse(content);
                    if (typeof json.revokedAt === 'number')
                        return [2 /*return*/, json.revokedAt];
                    return [2 /*return*/, null];
                case 2:
                    err_2 = _a.sent();
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function setRevokedAtFile(ts) {
    return __awaiter(this, void 0, void 0, function () {
        var json;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, ensureRuntimeDir()];
                case 1:
                    _a.sent();
                    json = { revokedAt: ts };
                    return [4 /*yield*/, promises_1.default.writeFile(FILE_PATH, JSON.stringify(json, null, 2), { encoding: 'utf8' })];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// Exported functions that choose Redis at runtime when available
function getRevokedAt() {
    return __awaiter(this, void 0, void 0, function () {
        var getRevokedAtRedis, err_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!env_1.env.REDIS_URL) return [3 /*break*/, 5];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('./tokenRevocationRedis'); })];
                case 2:
                    getRevokedAtRedis = (_a.sent()).getRevokedAtRedis;
                    return [4 /*yield*/, getRevokedAtRedis()];
                case 3: return [2 /*return*/, _a.sent()];
                case 4:
                    err_3 = _a.sent();
                    console.error('Falha ao ler revogação via Redis, caindo para arquivo local', err_3);
                    return [2 /*return*/, getRevokedAtFile()];
                case 5:
                    if (!env_1.env.REDIS_URL && env_1.env.NODE_ENV === 'production') {
                        logger_1.logger.warn('[auth] REDIS_URL não configurada. Usando armazenamento local para revogação, o que não é recomendado para ambientes multi-instância.');
                    }
                    return [2 /*return*/, getRevokedAtFile()];
            }
        });
    });
}
function setRevokedAt(ts) {
    return __awaiter(this, void 0, void 0, function () {
        var setRevokedAtRedis, err_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!env_1.env.REDIS_URL) return [3 /*break*/, 5];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('./tokenRevocationRedis'); })];
                case 2:
                    setRevokedAtRedis = (_a.sent()).setRevokedAtRedis;
                    return [4 /*yield*/, setRevokedAtRedis(ts)];
                case 3: return [2 /*return*/, _a.sent()];
                case 4:
                    err_4 = _a.sent();
                    console.error('Falha ao escrever revogação via Redis, caindo para arquivo local', err_4);
                    return [2 /*return*/, setRevokedAtFile(ts)];
                case 5: return [2 /*return*/, setRevokedAtFile(ts)];
            }
        });
    });
}
