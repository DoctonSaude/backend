"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatientCrud = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
exports.PatientCrud = {
    async create(data) {
        return prisma_1.default.patient.create({ data });
    },
    async findById(id) {
        return prisma_1.default.patient.findUnique({ where: { id } });
    },
    async findByUserId(userId) {
        return prisma_1.default.patient.findUnique({ where: { userId } });
    },
    async update(id, data) {
        return prisma_1.default.patient.update({ where: { id }, data });
    },
    async delete(id) {
        return prisma_1.default.patient.delete({ where: { id } });
    },
    async list() {
        return prisma_1.default.patient.findMany();
    },
};
//# sourceMappingURL=patient.crud.js.map