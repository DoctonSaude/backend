"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
var winston = require("winston");
var winston_daily_rotate_file_1 = require("winston-daily-rotate-file");
var env_js_1 = require("../config/env.js");
var _a = winston.format, combine = _a.combine, timestamp = _a.timestamp, printf = _a.printf, colorize = _a.colorize, json = _a.json;
var logFormat = printf(function (_a) {
    var level = _a.level, message = _a.message, timestamp = _a.timestamp, meta = __rest(_a, ["level", "message", "timestamp"]);
    var metaStr = Object.keys(meta).length ? " ".concat(JSON.stringify(meta)) : '';
    return "".concat(timestamp, " [").concat(level, "]: ").concat(message).concat(metaStr);
});
var fs = require("fs");
// Ensure the logs directory exists to prevent crash on production
if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs', { recursive: true });
}
exports.logger = winston.createLogger({
    level: env_js_1.env.LOG_LEVEL || 'info',
    format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
    transports: [
        new winston.transports.Console({
            format: combine(colorize({ all: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
        }),
        new winston_daily_rotate_file_1.default({
            filename: 'logs/error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d'
        }),
        new winston_daily_rotate_file_1.default({
            filename: 'logs/combined-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d'
        }),
    ],
});
// Wrapper para manter compatibilidade com a interface antiga se necessário, 
// embora Winston já tenha os métodos .info, .error, .warn, .debug
exports.default = exports.logger;
