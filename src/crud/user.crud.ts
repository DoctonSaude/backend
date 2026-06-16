// @ts-nocheck
// import supabase from '../../supabaseClient.js'; // Removed unused Supabase client
import prisma from '../lib/prisma.js';
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
        economicGroupId: true,
        avatar: true
      }
    });
    return normalizeUser(prismaUser);
  },

  async findByEmail(email: string) {
    console.log(`!!! V18-ULTIMATE-DEBUG !!! Checking email: ${email}`);
    try {
      const prismaUser = await prisma.user.findUnique({
        where: { email },
        include: {
          Partner: {
            select: { id: true, isApproved: true, type: true }
          },
          Pharmacy: {
            select: { id: true, isApproved: true, reasonSocial: true }
          },
          Patient: {
            include: {
              Subscription: {
                include: { Plan: true },
                where: { status: 'ACTIVE' },
                take: 1
              }
            }
          }
        }
      });
      return normalizeUser(prismaUser);
    } catch (err: any) {
      console.error('!!! PRISMA CRITICAL ERROR !!!', err);
      throw err;
    }
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
    const prismaUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        createdAt: true
      }
    });
    return prismaUsers.map(normalizeUser);
  },
};
