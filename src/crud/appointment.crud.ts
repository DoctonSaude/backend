import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';

export const AppointmentCrud = {
  async create(data: any) {
    return prisma.appointment.create({ data });
  },
  async findById(id: string) {
    return prisma.appointment.findUnique({ where: { id } });
  },
  async update(id: string, data: any) {
    return prisma.appointment.update({ where: { id }, data });
  },
  async delete(id: string) {
    return prisma.appointment.delete({ where: { id } });
  },
  async list() {
    return prisma.appointment.findMany();
  },
};
