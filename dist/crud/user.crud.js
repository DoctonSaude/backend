"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserCrud = void 0;
// import supabase from '../../supabaseClient.js'; // Removed unused Supabase client
const prisma_1 = __importDefault(require("../lib/prisma"));
const uuid_1 = require("uuid");
// Helper to match Prisma's return interface (approximately)
const normalizeUser = (user) => {
    if (!user)
        return null;
    return user;
};
exports.UserCrud = {
    async create(data) {
        const id = data.id || (0, uuid_1.v4)();
        const userData = { ...data, id };
        // Remove undefined fields
        Object.keys(userData).forEach(key => userData[key] === undefined && delete userData[key]);
        const created = await prisma_1.default.user.create({ data: userData });
        return normalizeUser(created);
    },
    async findById(id) {
        const prismaUser = await prisma_1.default.user.findUnique({ where: { id } });
        return normalizeUser(prismaUser);
    },
    async findByEmail(email) {
        const prismaUser = await prisma_1.default.user.findUnique({
            where: { email },
            include: {
                partner: true,
                patient: {
                    include: {
                        subscriptions: {
                            include: { plan: true },
                            where: { status: 'ACTIVE' },
                            take: 1
                        }
                    }
                }
            }
        });
        return normalizeUser(prismaUser);
    },
    async update(id, data) {
        const updateData = { ...data };
        // Remove undefined fields
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
        const updated = await prisma_1.default.user.update({ where: { id }, data: updateData });
        return normalizeUser(updated);
    },
    async delete(id) {
        const deleted = await prisma_1.default.user.delete({ where: { id } });
        return normalizeUser(deleted);
    },
    async list() {
        const prismaUsers = await prisma_1.default.user.findMany();
        return prismaUsers.map(normalizeUser);
    },
};
//# sourceMappingURL=user.crud.js.map