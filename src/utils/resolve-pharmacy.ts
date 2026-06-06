import prisma from '../lib/prisma.js';

/** Resolve a farmácia vinculada ao usuário PHARMACY (pharmacyId direto ou relação User). */
export async function resolvePharmacyForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pharmacyId: true },
  });

  if (user?.pharmacyId) {
    const byId = await prisma.pharmacy.findUnique({
      where: { id: user.pharmacyId },
      select: { id: true, name: true },
    });
    if (byId) return byId;
  }

  return prisma.pharmacy.findFirst({
    where: { User: { some: { id: userId } } },
    select: { id: true, name: true },
  });
}
