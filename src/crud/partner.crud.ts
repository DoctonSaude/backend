import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';

export const PartnerCrud = {
  async create(data: any) {
    return prisma.partner.create({ data });
  },
  async findById(id: string) {
    return prisma.partner.findUnique({ where: { id } });
  },
  async findByUserId(userId: string) {
    return prisma.partner.findUnique({ where: { userId } });
  },
  async update(id: string, data: any) {
    return prisma.partner.update({ where: { id }, data });
  },
  async delete(id: string) {
    return prisma.partner.delete({ where: { id } });
  },
  async list() {
    return prisma.partner.findMany();
  },
};
