import prisma from '../lib/prisma';

export const PatientCrud = {
  async create(data: any) {
    return prisma.patient.create({ data });
  },
  async findById(id: string) {
    return prisma.patient.findUnique({ where: { id } });
  },
  async findByUserId(userId: string) {
    return prisma.patient.findUnique({ where: { userId } });
  },
  async update(id: string, data: any) {
    return prisma.patient.update({ where: { id }, data });
  },
  async delete(id: string) {
    return prisma.patient.delete({ where: { id } });
  },
  async list() {
    return prisma.patient.findMany();
  },
};
