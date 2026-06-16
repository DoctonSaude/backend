import prisma from '../lib/prisma.js';

export type PartnerReviewDto = {
  id: string;
  rating: number;
  comment: string | null;
  reply: string | null;
  replyDate: string | null;
  createdAt: string;
  patient: {
    user: {
      name: string;
      avatar?: string | null;
    };
  };
  appointment: {
    dateTime: string;
  };
};

function mapReview(r: {
  id: string;
  rating: number;
  comment: string | null;
  reply: string | null;
  replyDate: Date | null;
  createdAt: Date;
  patient: {
    User: { name: string | null; avatar: string | null } | null;
  } | null;
  appointment: { dateTime: Date } | null;
}): PartnerReviewDto {
  return {
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    reply: r.reply,
    replyDate: r.replyDate?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    patient: {
      user: {
        name: r.patient?.User?.name ?? 'Paciente',
        avatar: r.patient?.User?.avatar ?? undefined,
      },
    },
    appointment: {
      dateTime: (r.appointment?.dateTime ?? r.createdAt).toISOString(),
    },
  };
}

export class ReputationService {
  async getReputationStats(partnerId: string) {
    const reviews = await prisma.review.findMany({
      where: { partnerId },
    });

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        nps: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const total = reviews.length;
    let sum = 0;
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>;

    let promoters = 0;
    let detractors = 0;

    reviews.forEach((r) => {
      sum += r.rating;
      const star = Math.min(5, Math.max(1, r.rating));
      dist[star] = (dist[star] ?? 0) + 1;

      if (r.rating === 5) promoters++;
      if (r.rating <= 3) detractors++;
    });

    const averageRating = sum / total;
    const nps = ((promoters - detractors) / total) * 100;

    return {
      averageRating: parseFloat(averageRating.toFixed(1)),
      totalReviews: total,
      nps: Math.round(nps),
      distribution: dist,
    };
  }

  async getPartnerReviews(partnerId: string): Promise<PartnerReviewDto[]> {
    const reviews = await prisma.review.findMany({
      where: { partnerId },
      include: {
        patient: {
          include: {
            User: {
              select: { name: true, avatar: true },
            },
          },
        },
        appointment: {
          select: { dateTime: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reviews.map(mapReview);
  }

  async replyToReview(reviewId: string, partnerId: string, reply: string) {
    const review = await prisma.review.findFirst({
      where: { id: reviewId, partnerId },
    });

    if (!review) {
      throw new Error('Avaliação não encontrada ou não pertence a este parceiro.');
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: {
        reply,
        replyDate: new Date(),
        updatedAt: new Date(),
      },
      include: {
        patient: {
          include: {
            User: {
              select: { name: true, avatar: true },
            },
          },
        },
        appointment: {
          select: { dateTime: true },
        },
      },
    });

    return mapReview(updated);
  }
}

export const reputationService = new ReputationService();
