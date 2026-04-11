// import supabase from '../../supabaseClient.js'; // Removed unused Supabase client
import prisma from '../lib/prisma';
import { v4 as uuidv4 } from 'uuid';

// Helper to match Prisma's return interface (approximately)
const normalizeUser = (user: any) => {
  if (!user) return null;
  return user;
};

export const UserCrud = {
  async create(data: any) {
    const id = data.id || uuidv4();
    const userData = { ...data, id };

    // Remove undefined fields
    Object.keys(userData).forEach(key => (userData as any)[key] === undefined && delete (userData as any)[key]);

    const created = await prisma.user.create({ data: userData as any });
    return normalizeUser(created);
  },

  async findById(id: string) {
    const prismaUser = await prisma.user.findUnique({ where: { id } });
    return normalizeUser(prismaUser);
  },

  async findByEmail(email: string) {
    const prismaUser = await prisma.user.findUnique({
      where: { email },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            specialty: true,
            isApproved: true,
            rating: true,
            totalReviews: true
          }
        },
        pharmacy: {
          select: {
            id: true,
            name: true,
            isApproved: true
          }
        },
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

  async update(id: string, data: any) {
    const updateData = { ...data };
    // Remove undefined fields
    Object.keys(updateData).forEach(key => (updateData as any)[key] === undefined && delete (updateData as any)[key]);

    const updated = await prisma.user.update({ where: { id }, data: updateData as any });
    return normalizeUser(updated);
  },

  async delete(id: string) {
    const deleted = await prisma.user.delete({ where: { id } });
    return normalizeUser(deleted);
  },

  async list() {
    const prismaUsers = await prisma.user.findMany();
    return prismaUsers.map(normalizeUser);
  },
};
