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
    const prismaUser = await prisma.user.findUnique({ 
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        personId: true,
        tenantId: true,
        avatar: true
      }
    });
    return normalizeUser(prismaUser);
  },

  async findByEmail(email: string) {
    const prismaUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        tenantId: true,
        personId: true,
        avatar: true
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
