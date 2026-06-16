"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.getRedisClient = getRedisClient;
exports.getBullMQConnection = getBullMQConnection;
exports.checkRedisHealth = checkRedisHealth;
var ioredis_1 = require("ioredis");
var env_js_1 = require("../config/env.js");
var logger_js_1 = require("./logger.js");
var client = null;
var bullmqClient = null;
function createClient(url, options) {
    if (options === void 0) { options = {}; }
    if (!url || url.trim() === '') {
        console.log('ℹ️  Redis URL not configured - Redis disabled');
        return null;
    }
    try {
        var c = new ioredis_1.Redis(url, __assign({ lazyConnect: true, maxRetriesPerRequest: 3, connectTimeout: 5000, retryStrategy: function (times) {
                if (times > 3) {
                    console.warn('⚠️  Redis connection failed after 3 retries - operating without Redis');
                    return null; // Stop retrying
                }
                return Math.min(times * 100, 3000);
            } }, options));
        c.on('error', function (err) {
            // Just log, don't crash
            if (env_js_1.env.NODE_ENV === 'development') {
                // Keep it quiet in dev logs if it's just a connection failure
                if (err.code !== 'ECONNREFUSED') {
                    console.error('Redis Error:', err.message);
                }
            }
            else {
                console.error('Redis Error:', err);
            }
        });
        c.on('connect', function () {
            console.log('✅ Redis connected successfully');
        });
        return c;
    }
    catch (error) {
        console.error('Failed to create Redis client:', error);
        return null;
    }
}
function getRedisClient() {
    if (!env_js_1.env.REDIS_URL) {
        return null;
    }
    if (!client) {
        client = createClient(env_js_1.env.REDIS_URL);
    }
    return client;
}
function getBullMQConnection() {
    if (!env_js_1.env.REDIS_URL || env_js_1.env.REDIS_URL.trim() === '') {
        return null;
    }
    if (!bullmqClient) {
        try {
            bullmqClient = createClient(env_js_1.env.REDIS_URL, {
                maxRetriesPerRequest: null,
            });
        }
        catch (error) {
            logger_js_1.logger.error('Failed to create BullMQ Redis connection:', error);
            return null;
        }
    }
    return bullmqClient;
}
/**
 * Pings Redis to check if it's alive and reachable
 */
function checkRedisHealth() {
    return __awaiter(this, void 0, void 0, function () {
        var redis, result, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    redis = getRedisClient();
                    if (!redis) {
                        return [2 /*return*/, { status: 'down', message: 'REDIS_URL not configured' }];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, Promise.race([
                            redis.ping(),
                            new Promise(function (_, reject) { return setTimeout(function () { return reject(new Error('Redis PING timeout')); }, 2000); })
                        ])];
                case 2:
                    result = _a.sent();
                    if (result === 'PONG') {
                        return [2 /*return*/, { status: 'up' }];
                    }
                    return [2 /*return*/, { status: 'down', message: 'Unexpected response from Redis' }];
                case 3:
                    error_1 = _a.sent();
                    return [2 /*return*/, { status: 'down', message: error_1.message }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
