"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentCrud = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
exports.AppointmentCrud = {
    async create(data) {
        return prisma_1.default.appointment.create({ data });
    },
    async findById(id) {
        return prisma_1.default.appointment.findUnique({ where: { id } });
    },
    async update(id, data) {
        return prisma_1.default.appointment.update({ where: { id }, data });
    },
    async delete(id) {
        return prisma_1.default.appointment.delete({ where: { id } });
    },
    async list() {
        return prisma_1.default.appointment.findMany();
    },
};
//# sourceMappingURL=appointment.crud.js.map