"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartnerCrud = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
exports.PartnerCrud = {
    async create(data) {
        return prisma_1.default.partner.create({ data });
    },
    async findById(id) {
        return prisma_1.default.partner.findUnique({ where: { id } });
    },
    async findByUserId(userId) {
        return prisma_1.default.partner.findUnique({ where: { userId } });
    },
    async update(id, data) {
        return prisma_1.default.partner.update({ where: { id }, data });
    },
    async delete(id) {
        return prisma_1.default.partner.delete({ where: { id } });
    },
    async list() {
        return prisma_1.default.partner.findMany();
    },
};
//# sourceMappingURL=partner.crud.js.map