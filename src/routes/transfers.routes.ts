// @ts-nocheck
import { Router } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate, authorize('ADMIN'));

// Helpers
const toFrontend = (t: any) => ({
    id: t.id,
    partnerName: t.partnerName,
    partnerEmail: t.partnerEmail,
    amount: t.amount,
    // Map PAID to APPROVED for frontend compatibility if strictly typed
    status: t.status === 'PAID' ? 'APPROVED' : t.status,
    createdAt: t.createdAt,
    type: t.type,
    receipt: t.receiptUrl // Map receiptUrl to receipt
});

// Get Transfers List
router.get('/', async (req, res) => {
    try {
        const { page = 1, pageSize = 10, status, q, type, sortBy, sortDir, startDate, endDate } = req.query;
        const skip = (Number(page) - 1) * Number(pageSize);

        const where: any = {};
        if (status && status !== 'all') where.status = String(status).toUpperCase();
        
        if (type && type !== 'Todos') where.type = String(type);

        if (startDate && endDate) {
            const start = new Date(String(startDate));
            const end = new Date(String(endDate));
            end.setHours(23, 59, 59, 999); // Include full end day

            where.createdAt = {
                gte: start,
                lte: end
            };
        }
        if (q) {
            where.OR = [
                { partnerName: { contains: String(q), mode: 'insensitive' } },
                { partnerEmail: { contains: String(q), mode: 'insensitive' } }
            ];
        }

        const orderBy: any = {};
        if (sortBy === 'amount') {
            orderBy.amount = sortDir === 'asc' ? 'asc' : 'desc';
        } else {
            orderBy.createdAt = sortDir === 'asc' ? 'asc' : 'desc';
        }

        const [total, items] = await prisma.$transaction([
            prisma.transfer.count({ where }),
            prisma.transfer.findMany({
                where,
                skip,
                take: Number(pageSize),
                orderBy
            })
        ]);

        res.json({
            items: items.map(toFrontend),
            total,
            page: Number(page),
            pageSize: Number(pageSize),
            totalPages: Math.ceil(total / Number(pageSize))
        });
    } catch (error) {
        console.error('Error getting transfers:', error);
        res.status(500).json({ error: 'Failed to fetch transfers' });
    }
});

// Create Transfer
router.post('/', async (req, res) => {
    try {
        const schema = z.object({
            partnerId: z.string().optional(), // Link to partner
            partnerName: z.string(),
            partnerEmail: z.string().email(),
            amount: z.number(),
            type: z.string(),
            status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'PAID']).optional(),
            receipt: z.string().nullable().optional(),
            createdAt: z.string().optional()
        });

        const data = schema.parse(req.body);

        const transfer = await prisma.transfer.create({
            data: {
                partnerId: data.partnerId,
                partnerName: data.partnerName,
                partnerEmail: data.partnerEmail,
                amount: data.amount,
                type: data.type,
                status: data.status || 'PENDING',
                receiptUrl: data.receipt,
                createdAt: data.createdAt ? new Date(data.createdAt) : undefined
            }
        });

        res.json(toFrontend(transfer));
    } catch (error) {
        console.error('Error creating transfer:', error);
        res.status(400).json({ error: 'Failed to create transfer' });
    }
});

// Update Transfer
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const schema = z.object({
            partnerId: z.string().optional(),
            partnerName: z.string().optional(),
            partnerEmail: z.string().email().optional(),
            amount: z.number().optional(),
            type: z.string().optional(),
            status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'PAID']).optional(),
            receipt: z.string().nullable().optional(),
            createdAt: z.string().optional()
        });

        const data = schema.parse(req.body);
        const updateData: any = {};
        if (data.partnerId !== undefined) updateData.partnerId = data.partnerId;
        if (data.partnerName !== undefined) updateData.partnerName = data.partnerName;
        if (data.partnerEmail !== undefined) updateData.partnerEmail = data.partnerEmail;
        if (data.amount !== undefined) updateData.amount = data.amount;
        if (data.type !== undefined) updateData.type = data.type;
        if (data.status !== undefined) updateData.status = data.status;
        if (data.receipt !== undefined) updateData.receiptUrl = data.receipt;
        if (data.createdAt !== undefined) updateData.createdAt = new Date(data.createdAt);

        const transfer = await prisma.transfer.update({
            where: { id },
            data: updateData
        });

        res.json(toFrontend(transfer));
    } catch (error) {
        console.error('Error updating transfer:', error);
        res.status(400).json({ error: 'Failed to update transfer' });
    }
});

// Delete Transfer
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.transfer.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting transfer:', error);
        res.status(500).json({ error: 'Failed to delete transfer' });
    }
});

// Process Transfer (approve with receipt)
router.post('/:id/process', async (req, res) => {
    try {
        const { id } = req.params;
        const { receipt } = req.body;
        const transfer = await prisma.transfer.update({
            where: { id },
            data: {
                status: 'APPROVED',
                receiptUrl: receipt
            }
        });

        res.json(toFrontend(transfer));
    } catch (error) {
        console.error('Error processing transfer:', error);
        res.status(500).json({ error: 'Failed to process transfer' });
    }
});

// Reject Transfer
router.post('/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const transfer = await prisma.transfer.update({
            where: { id },
            data: {
                status: 'REJECTED'
            }
        });

        res.json(toFrontend(transfer));
    } catch (error) {
        console.error('Error rejecting transfer:', error);
        res.status(500).json({ error: 'Failed to reject transfer' });
    }
});

// Upload Receipt
router.post('/:id/receipt', async (req, res) => {
    try {
        // For now, we'll just store the filename; in production, use storage service
        const { id } = req.params;
        // In real app, you'd use multer to handle file uploads
        const filename = req.body.receipt || req.query.receipt || 'receipt.pdf';
        
        const transfer = await prisma.transfer.update({
            where: { id },
            data: { receiptUrl: filename }
        });

        res.json(toFrontend(transfer));
    } catch (error) {
        console.error('Error uploading receipt:', error);
        res.status(500).json({ error: 'Failed to upload receipt' });
    }
});

// Download Receipt
router.get('/:id/receipt', async (req, res) => {
    try {
        const { id } = req.params;
        const transfer = await prisma.transfer.findUnique({ where: { id } });
        
        if (!transfer || !transfer.receiptUrl) {
            return res.status(404).json({ error: 'Receipt not found' });
        }
        
        // For demo purposes, return a placeholder; in production, serve the actual file
        res.sendFile(transfer.receiptUrl, { root: '.' }, (err) => {
            if (err) {
                res.status(404).json({ error: 'Receipt not found' });
            }
        });
    } catch (error) {
        console.error('Error downloading receipt:', error);
        res.status(500).json({ error: 'Failed to download receipt' });
    }
});

// Summary Stats
router.get('/summary', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        // Current Period
        const currentWhere: any = {};
        if (startDate && endDate) {
            const start = new Date(String(startDate));
            const end = new Date(String(endDate));
            end.setHours(23, 59, 59, 999); // Include full end day

            currentWhere.createdAt = {
                gte: start,
                lte: end
            };
        } else {
            // Default to current month
            const now = new Date();
            currentWhere.createdAt = {
                gte: new Date(now.getFullYear(), now.getMonth(), 1),
                lte: new Date(now.getFullYear(), now.getMonth() + 1, 0)
            };
        }

        // Previous Period for Growth
        const curStart = currentWhere.createdAt.gte;
        const curEnd = currentWhere.createdAt.lte;
        const duration = curEnd.getTime() - curStart.getTime();
        const prevEnd = new Date(curStart.getTime() - 1);
        const prevStart = new Date(prevEnd.getTime() - duration);

        const [pending, completed, rejected, totalAmount, prevTotalAmount] = await Promise.all([
            prisma.transfer.count({ where: { ...currentWhere, status: 'PENDING' } }),
            prisma.transfer.count({ where: { ...currentWhere, status: { in: ['APPROVED', 'PAID'] } } }),
            prisma.transfer.count({ where: { ...currentWhere, status: 'REJECTED' } }),
            prisma.transfer.aggregate({
                _sum: { amount: true },
                where: { ...currentWhere, status: { in: ['APPROVED', 'PAID'] } }
            }),
            prisma.transfer.aggregate({
                _sum: { amount: true },
                where: { createdAt: { gte: prevStart, lte: prevEnd }, status: { in: ['APPROVED', 'PAID'] } }
            })
        ]);

        const currentVal = totalAmount._sum.amount || 0;
        const prevVal = prevTotalAmount._sum.amount || 0;
        let growth = 0;
        if (prevVal > 0) growth = ((currentVal - prevVal) / prevVal) * 100;
        else if (currentVal > 0) growth = 100;

        res.json({
            data: {
                pendingTransfers: pending,
                approvedTransfers: completed,
                rejectedTransfers: rejected,
                totalTransfers: pending + completed + rejected,
                totalAmount: currentVal,
                monthlyGrowth: Number(growth.toFixed(1))
            }
        });
    } catch (error) {
        console.error('Error getting transfers summary:', error);
        res.status(500).json({ error: 'Failed to fetch summary' });
    }
});

// Transfers by Month
router.get('/by-month', async (req, res) => {
    try {
        const date = new Date();
        date.setMonth(date.getMonth() - 6);

        const transfers = await prisma.transfer.findMany({
            where: {
                createdAt: { gte: date },
                status: { in: ['APPROVED', 'PAID'] }
            },
            orderBy: { createdAt: 'asc' }
        });

        const grouped = new Map();
        transfers.forEach(t => {
            const key = t.createdAt.toISOString().slice(0, 7);
            const current = grouped.get(key) || 0;
            grouped.set(key, current + t.amount);
        });

        const data = Array.from(grouped.entries()).map(([month, amount]) => ({
            month: month, // Frontend expects 'month' (Repasses.tsx line 104) inside monthlySeries, wait line 104 says {month: string; valor: number} ??
            // Let's check line 104: const [monthlySeries, setMonthlySeries] = useState<Array<{month:string; valor:number}>>([]);
            // So backend should return { month: '...', valor: ... }
            valor: amount
        }));

        res.json({ data });
    } catch (error) {
        console.error('Error getting transfers by month:', error);
        res.status(500).json({ error: 'Failed to fetch chart data' });
    }
});

// Transfers by Partner Type
router.get('/by-partner-type', async (req, res) => {
    try {
        const transfers = await prisma.transfer.groupBy({
            by: ['type'],
            _sum: { amount: true }
        });

        const data = transfers.map(t => ({
            name: t.type,
            value: t._sum.amount || 0,
            count: 0 // Mock count if needed
        }));

        res.json({ data });
    } catch (error) {
        console.error('Error getting transfers by type:', error);
        res.status(500).json({ error: 'Failed to fetch chart data' });
    }
});

export default router;
