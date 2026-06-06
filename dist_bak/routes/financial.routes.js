"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const auth_js_1 = require("../middleware/auth.js");
const loyalty_service_js_1 = require("../services/loyalty.service.js");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const router = (0, express_1.Router)();
router.use(auth_js_1.authenticate, (0, auth_js_1.authorize)('ADMIN'));
// Helpers for Translation and Formatting
const toFrontend = (t) => {
    // ...
    const dateObj = new Date(t.date);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return {
        id: t.id,
        description: t.description,
        client: t.client || t.category || '', // Fallback
        amount: t.amount, // Backend keeps amount, Frontend might accept amount? No, Frontend uses 'value'
        value: t.type === 'EXPENSE' ? -t.amount : t.amount, // Frontend expects signed value? line 204 says value is ABS in form, but in list?
        // Frontend list sort by value uses Math.abs.
        // Frontend render uses formatCurrency(t.value).
        // Let's check logic: value: formData.type === 'Saída' ? -normalizedValue : normalizedValue
        // So frontend stores signed value.
        type: t.type === 'INCOME' ? 'Entrada' : 'Saída',
        status: t.status === 'COMPLETED' ? 'Concluído' : t.status === 'PENDING' ? 'Pendente' : 'Cancelado',
        date: `${day}/${month}/${year}`,
        dueDate: t.dueDate, // New
        paymentDate: t.paymentDate, // New
        dreCategory: t.dreCategory, // New
        partnerId: t.partnerId, // New
        category: t.category // Frontend doesn't seem to use category in list but might be useful
    };
};
const parseDatePT = (dateStr) => {
    if (!dateStr)
        return undefined;
    if (dateStr instanceof Date)
        return dateStr;
    if (typeof dateStr !== 'string')
        return new Date();
    if (dateStr.includes('-'))
        return new Date(dateStr); // YYYY-MM-DD
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
};
const calculateDRE = (txs) => {
    const buckets = {
        grossRevenue: 0,
        deductions: 0,
        costs: 0,
        expenses: 0,
        taxes: 0
    };
    txs.forEach(t => {
        const cat = t.dreCategory || (t.type === 'INCOME' ? 'RECEITA_BRUTA' : 'DESPESAS_OPERACIONAIS');
        const val = t.amount;
        switch (cat) {
            case 'RECEITA_BRUTA':
                buckets.grossRevenue += val;
                break;
            case 'DEDUCOES':
                buckets.deductions += val;
                break;
            case 'CUSTOS':
                buckets.costs += val;
                break;
            case 'DESPESAS_OPERACIONAIS':
                buckets.expenses += val;
                break;
            case 'IMPOSTOS':
                buckets.taxes += val;
                break;
            default:
                if (t.type === 'INCOME')
                    buckets.grossRevenue += val;
                else
                    buckets.expenses += val;
        }
    });
    const netRevenue = buckets.grossRevenue - buckets.deductions;
    const grossProfit = netRevenue - buckets.costs;
    const operatingProfit = grossProfit - buckets.expenses;
    const netProfit = operatingProfit - buckets.taxes;
    return {
        ...buckets,
        netRevenue,
        grossProfit,
        operatingProfit,
        netProfit
    };
};
// Stats / Summary
// Stats / Summary
router.get('/summary', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        // Current Period
        const currentWhere = {};
        let start = new Date();
        let end = new Date();
        if (startDate && endDate) {
            start = new Date(String(startDate));
            end = new Date(String(endDate));
            end.setHours(23, 59, 59, 999);
            currentWhere.date = { gte: start, lte: end };
        }
        else {
            // Default: Current Month
            const now = new Date();
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            currentWhere.date = { gte: start, lte: end };
        }
        // Previous Period
        const duration = end.getTime() - start.getTime();
        const prevEnd = new Date(start.getTime() - 1);
        const prevStart = new Date(prevEnd.getTime() - duration);
        const prevWhere = {
            date: { gte: prevStart, lte: prevEnd }
        };
        const [currentTransactions, prevTransactions] = await Promise.all([
            prisma_js_1.default.transaction.findMany({ where: currentWhere }),
            prisma_js_1.default.transaction.findMany({ where: prevWhere })
        ]);
        const calcTotals = (txs) => {
            const income = txs
                .filter(t => t.type === 'INCOME' && t.status === 'COMPLETED')
                .reduce((sum, t) => sum + t.amount, 0);
            const expenses = txs
                .filter(t => t.type === 'EXPENSE' && t.status === 'COMPLETED')
                .reduce((sum, t) => sum + t.amount, 0);
            const profit = income - expenses;
            const margin = income > 0 ? (profit / income) * 100 : 0;
            return { income, expenses, profit, margin };
        };
        const curr = calcTotals(currentTransactions);
        const prev = calcTotals(prevTransactions);
        const calcGrowth = (c, p) => {
            if (p === 0)
                return c === 0 ? 0 : 100;
            return ((c - p) / p) * 100;
        };
        res.json({
            totalRevenue: curr.income,
            totalExpenses: curr.expenses,
            netProfit: curr.profit,
            profitMargin: curr.margin,
            revenueGrowth: calcGrowth(curr.income, prev.income),
            expenseGrowth: calcGrowth(curr.expenses, prev.expenses),
            profitGrowth: calcGrowth(curr.profit, prev.profit),
            marginGrowth: calcGrowth(curr.margin, prev.margin)
        });
    }
    catch (error) {
        console.error('Error getting financial summary:', error);
        res.status(500).json({ error: 'Failed to fetch financial summary' });
    }
});
// Transactions List
router.get('/transactions', async (req, res) => {
    try {
        console.log('[Financial] GET /transactions called', req.query);
        const { page = 1, pageSize = 10, type, status, search, startDate, endDate, sortBy, sortDir } = req.query;
        const pageNum = Number(page) || 1;
        const pageSizeNum = Number(pageSize) || 10;
        const skip = (pageNum - 1) * pageSizeNum;
        // Map Frontend filters to Backend
        const where = {};
        if (type && type !== 'Todos') {
            where.type = String(type) === 'Entrada' ? 'INCOME' : 'EXPENSE';
        }
        if (status && status !== 'Todos') {
            if (status === 'Concluído')
                where.status = 'COMPLETED';
            else if (status === 'Pendente')
                where.status = 'PENDING';
            else if (status === 'Cancelado')
                where.status = 'CANCELLED';
            else
                where.status = String(status);
        }
        if (startDate && endDate) {
            where.date = {
                gte: new Date(String(startDate)),
                lte: new Date(String(endDate))
            };
        }
        if (search) {
            where.OR = [
                { description: { contains: String(search), mode: 'insensitive' } },
                { client: { contains: String(search), mode: 'insensitive' } },
                { category: { contains: String(search), mode: 'insensitive' } }
            ];
        }
        // Sort mapping
        let orderBy = { date: 'desc' };
        if (sortBy === 'value') {
            orderBy = { amount: sortDir === 'asc' ? 'asc' : 'desc' };
        }
        else if (sortBy === 'date') {
            orderBy = { date: sortDir === 'asc' ? 'asc' : 'desc' };
        }
        const [total, items] = await prisma_js_1.default.$transaction([
            prisma_js_1.default.transaction.count({ where }),
            prisma_js_1.default.transaction.findMany({
                where,
                skip,
                take: pageSizeNum,
                orderBy
            })
        ]);
        const mappedItems = items.map(toFrontend);
        res.json({
            items: mappedItems,
            total,
            page: pageNum,
            pageSize: pageSizeNum,
            totalPages: Math.ceil(total / pageSizeNum)
        });
    }
    catch (error) {
        console.error('Error getting transactions:', error);
        // Log to file to be sure
        const log = `[ERROR] ${new Date().toISOString()} - GET /transactions failed: ${error}\n`;
        try {
            fs.appendFileSync(path.join(process.cwd(), 'backend_errors.log'), log);
        }
        catch { }
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});
// Get Revenue (Chart Data)
router.get('/revenue', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let where = { status: 'COMPLETED' };
        if (startDate && endDate) {
            where.date = {
                gte: new Date(String(startDate)),
                lte: new Date(String(endDate))
            };
        }
        else {
            // Default to 6 months
            const start = new Date();
            start.setMonth(start.getMonth() - 6);
            where.date = { gte: start };
        }
        const transactions = await prisma_js_1.default.transaction.findMany({
            where,
            orderBy: { date: 'asc' }
        });
        // Group by month
        const grouped = new Map();
        transactions.forEach(t => {
            const dateObj = new Date(t.date);
            // Format as Month/Year or similar. Frontend uses 'month' string.
            // Usually "Jan", "Fev" etc for charts. Or "MM/YYYY". 
            // Let's inspect Financeiro.tsx chart lines.
            // <XAxis dataKey="month" />
            // Providing "YYYY-MM" is usually safest or "MM/YYYY".
            // Let's use "MMM" if short range, or "MM/YYYY".
            const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            const key = `${monthNames[dateObj.getMonth()]}`; // Just Month name? If spanning years might collide.
            // Let's try ISO YYYY-MM for sorting but Map key ??
            // Frontend examples usually show "Jan", "Fev".
            const mapKey = key;
            if (!grouped.has(mapKey))
                grouped.set(mapKey, { receita: 0, despesa: 0 });
            const entry = grouped.get(mapKey);
            if (t.type === 'INCOME')
                entry.receita += t.amount;
            else if (t.type === 'EXPENSE')
                entry.despesa += t.amount;
        });
        const data = Array.from(grouped.entries()).map(([month, vals]) => ({
            month,
            receita: vals.receita,
            despesa: vals.despesa
        }));
        res.json(data);
    }
    catch (error) {
        console.error('Error getting revenue data:', error);
        res.status(500).json({ error: 'Failed to fetch revenue data' });
    }
});
// Create Transaction
router.post('/transactions', async (req, res) => {
    try {
        const body = req.body;
        // Map Frontend to Backend
        const type = body.type === 'Entrada' ? 'INCOME' : 'EXPENSE';
        const status = body.status === 'Concluído' ? 'COMPLETED' : body.status === 'Pendente' ? 'PENDING' : 'CANCELLED';
        const date = parseDatePT(body.date);
        const amount = Math.abs(Number(body.value)); // Backend stores absolute amount
        const dueDate = parseDatePT(body.dueDate);
        const paymentDate = parseDatePT(body.paymentDate);
        // Note: Casting to any to avoid TS errors if client isn't regenerated yet
        const data = {
            description: body.description,
            amount: amount,
            type: type, // INCOME/EXPENSE
            category: body.client, // Storing client in category
            status: status,
            date: date,
            // New Fields
            dueDate: dueDate,
            paymentDate: paymentDate,
            dreCategory: body.dreCategory,
            partnerId: body.partnerId || undefined,
            patientId: body.patientId || undefined
        };
        const transaction = await prisma_js_1.default.transaction.create({ data });
        // Trigger loyalty processing if completed and has patient
        if (transaction.status === 'COMPLETED' && transaction.patientId) {
            loyalty_service_js_1.LoyaltyService.processTransactionPoints(transaction.id).catch(err => {
                console.error('Error processing transaction points:', err);
            });
        }
        res.json(toFrontend(transaction));
    }
    catch (error) {
        console.error('Error creating transaction:', error);
        const log = `[ERROR] ${new Date().toISOString()} - POST /transactions failed: ${error}\nBody was: ${JSON.stringify(req.body)}\n`;
        try {
            fs.appendFileSync(path.join(process.cwd(), 'backend_errors.log'), log);
        }
        catch { }
        res.status(400).json({ error: 'Failed to create transaction' });
    }
});
// Update Transaction
router.put('/transactions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;
        const updateData = {};
        if (body.type)
            updateData.type = body.type === 'Entrada' ? 'INCOME' : 'EXPENSE';
        if (body.status)
            updateData.status = body.status === 'Concluído' ? 'COMPLETED' : body.status === 'Pendente' ? 'PENDING' : 'CANCELLED';
        if (body.date)
            updateData.date = parseDatePT(body.date);
        if (body.value !== undefined)
            updateData.amount = Math.abs(Number(body.value));
        if (body.description)
            updateData.description = body.description;
        if (body.client) {
            updateData.category = body.client;
        }
        // New Fields
        if (body.dueDate !== undefined)
            updateData.dueDate = parseDatePT(body.dueDate);
        if (body.paymentDate !== undefined)
            updateData.paymentDate = parseDatePT(body.paymentDate);
        if (body.dreCategory !== undefined)
            updateData.dreCategory = body.dreCategory;
        if (body.partnerId !== undefined)
            updateData.partnerId = body.partnerId || null;
        const transaction = await prisma_js_1.default.transaction.update({
            where: { id },
            data: updateData
        });
        // Trigger loyalty processing if status changed to COMPLETED
        if (transaction.status === 'COMPLETED' && transaction.patientId) {
            loyalty_service_js_1.LoyaltyService.processTransactionPoints(transaction.id).catch(err => {
                console.error('Error processing transaction points:', err);
            });
        }
        res.json(toFrontend(transaction));
    }
    catch (error) {
        console.error('Error updating transaction:', error);
        res.status(500).json({ error: 'Failed to update transaction' });
    }
});
// Delete Transaction
router.delete('/transactions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_js_1.default.transaction.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting transaction:', error);
        res.status(500).json({ error: 'Failed to delete transaction' });
    }
});
// DRE Generator
router.get('/dre', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const where = { status: 'COMPLETED' };
        if (startDate && endDate) {
            where.date = {
                gte: new Date(String(startDate)),
                lte: new Date(String(endDate))
            };
        }
        else {
            const now = new Date();
            where.date = {
                gte: new Date(now.getFullYear(), 0, 1), // YTD
                lte: new Date()
            };
        }
        const txs = await prisma_js_1.default.transaction.findMany({ where });
        const data = calculateDRE(txs);
        res.json(data);
    }
    catch (error) {
        console.error('Error generating DRE:', error);
        res.status(500).json({ error: 'Failed to generate DRE' });
    }
});
// DRE Advanced Report (Monthly + Annual)
router.get('/dre/report', async (req, res) => {
    try {
        const { year = new Date().getFullYear() } = req.query;
        const selectedYear = Number(year);
        const startDate = new Date(selectedYear, 0, 1);
        const endDate = new Date(selectedYear, 11, 31, 23, 59, 59);
        // Fetch all completed transactions for the year
        const txs = await prisma_js_1.default.transaction.findMany({
            where: {
                status: 'COMPLETED',
                date: { gte: startDate, lte: endDate }
            },
            orderBy: { date: 'asc' }
        });
        // Group by month
        const monthlyData = Array.from({ length: 12 }, (_, i) => {
            const monthTxs = txs.filter(t => new Date(t.date).getMonth() === i);
            return {
                month: i + 1,
                ...calculateDRE(monthTxs)
            };
        });
        // Calculate Annual Total
        const annualTotal = calculateDRE(txs);
        // Add comparison (Growth vs Previous Month)
        const monthlyWithGrowth = monthlyData.map((curr, i) => {
            if (i === 0)
                return { ...curr, growth: 0 };
            const prev = monthlyData[i - 1];
            const growth = prev.netProfit !== 0
                ? ((curr.netProfit - prev.netProfit) / Math.abs(prev.netProfit)) * 100
                : (curr.netProfit !== 0 ? 100 : 0);
            return { ...curr, growth };
        });
        res.json({
            year: selectedYear,
            monthly: monthlyWithGrowth,
            annual: annualTotal
        });
    }
    catch (error) {
        console.error('Error generating DRE report:', error);
        res.status(500).json({ error: 'Failed to generate DRE report' });
    }
});
// Accounts Payable/Receivable Summary
router.get('/accounts/summary', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        // Use dueDate for filter if possible, or fallback to date
        // Ideally accounts payable looks at 'dueDate'
        let dueWhere = {};
        if (startDate && endDate) {
            dueWhere.dueDate = {
                gte: new Date(String(startDate)),
                lte: new Date(String(endDate))
            };
        }
        else {
            // Next 30 days default or all open?
            // Let's default to This Month
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            dueWhere.dueDate = { gte: start, lte: end };
        }
        // Fetch Pending, Scheduled, or even Completed (for history)
        // Usually Accounts Payable = Pending/Scheduled
        // User might want history too. Let's return all but categorize by status.
        // Actually, let's filter by PENDING for "A Pagar/A Receber" view.
        // But the previous implementation marked defaults as COMPLETED.
        const txs = await prisma_js_1.default.transaction.findMany({
            where: dueWhere,
            include: { partner: { select: { name: true } } }
        });
        const summary = {
            payable: 0,
            receivable: 0,
            byPartner: {},
            series: {}
        };
        txs.forEach(t => {
            if (t.status !== 'PENDING')
                return; // Only count pending for "Accounts Payable" forecast?
            // Actually, if filtering by date range, maybe we want realized too? 
            // "Contas a Pagar" usually implies future/open. "Contas Pagas" is history.
            // Let's include everything in the range, but maybe frontend filters by status.
            // For now, let's assume this endpoint is for "Projeção" (Projection). So status=PENDING.
            // Wait, if status is COMPLETED, it was paid.
            // Let's assume the user wants to see what is DUE in that period.
            // If it's already paid, it's settled.
            // If it's pending, it's liability.
            // Let's return all and let frontend decide?
            // Or better: Summarize Pending vs Paid?
            // Let's stick to "Pending" for "Accounts Payable/Receivable" definition.
            if (t.status !== 'PENDING')
                return;
            if (t.type === 'EXPENSE')
                summary.payable += t.amount;
            else
                summary.receivable += t.amount;
            // By Partner
            const pName = t.partner?.name || t.category || 'Outros'; // Use category as fallback for Client
            if (!summary.byPartner[pName])
                summary.byPartner[pName] = { payable: 0, receivable: 0 };
            if (t.type === 'EXPENSE')
                summary.byPartner[pName].payable += t.amount;
            else
                summary.byPartner[pName].receivable += t.amount;
            // Series (Daily)
            const dateKey = new Date(t.dueDate || t.date).toISOString().split('T')[0];
            if (!summary.series[dateKey])
                summary.series[dateKey] = { payable: 0, receivable: 0 };
            if (t.type === 'EXPENSE')
                summary.series[dateKey].payable += t.amount;
            else
                summary.series[dateKey].receivable += t.amount;
        });
        res.json({
            payable: summary.payable,
            receivable: summary.receivable,
            byPartner: Object.entries(summary.byPartner).map(([name, val]) => ({ name, ...val })),
            series: Object.entries(summary.series).map(([date, val]) => ({ date, ...val })).sort((a, b) => a.date.localeCompare(b.date))
        });
    }
    catch (error) {
        console.error('Error getting accounts summary:', error);
        res.status(500).json({ error: 'Failed to fetch accounts summary' });
    }
});
exports.default = router;
//# sourceMappingURL=financial.routes.js.map