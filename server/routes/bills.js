import express from 'express';
import Bill from '../models/Bill.js';
import authMiddleware from '../middleware/authMiddleware.js';
import adminMiddleware from '../middleware/adminMiddleware.js';
import { logActivity } from '../utils/activityLogger.js';
import { syncAllBillsToSheet } from '../utils/googleSheetsService.js';

const router = express.Router();

// Auto-generate bill number
async function generateBillNumber() {
    const last = await Bill.findOne().sort({ createdAt: -1 }).lean();
    if (!last || !last.billNumber) return 'BILL-001';
    const num = parseInt(last.billNumber.split('-')[1] || '0', 10);
    return `BILL-${String(num + 1).padStart(3, '0')}`;
}

// GET /api/bills
router.get('/', authMiddleware, async (req, res) => {
    try {
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 20);
        const skip  = (page - 1) * limit;

        const [bills, total] = await Promise.all([
            Bill.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate('createdBy', 'fullName'),
            Bill.countDocuments(),
        ]);
        res.json({ bills, total, page, hasMore: skip + bills.length < total });
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /api/bills
router.post('/', authMiddleware, async (req, res) => {
    try {
        const billNumber = await generateBillNumber();
        const bill = await Bill.create({ ...req.body, billNumber, createdBy: req.user?.id });
        logActivity('CREATE', 'Bill', `Bill created: ${billNumber} for ${bill.contractorName}`, req.user?.email, String(bill._id));
        res.json(bill);
        syncAllBillsToSheet().catch(err => console.error('[GoogleSheets] Bills sync after create:', err.message));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// PUT /api/bills/:id
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const bill = await Bill.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
        if (!bill) return res.status(404).json({ message: 'Bill not found' });
        logActivity('UPDATE', 'Bill', `Bill updated: ${bill.billNumber}`, req.user?.email, String(bill._id));
        res.json(bill);
        syncAllBillsToSheet().catch(err => console.error('[GoogleSheets] Bills sync after update:', err.message));
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// DELETE /api/bills/:id
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const bill = await Bill.findByIdAndDelete(req.params.id);
        if (!bill) return res.status(404).json({ message: 'Bill not found' });
        logActivity('DELETE', 'Bill', `Bill deleted: ${bill.billNumber}`, req.user?.email, String(bill._id));
        res.json({ message: 'Bill removed' });
        syncAllBillsToSheet().catch(err => console.error('[GoogleSheets] Bills sync after delete:', err.message));
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;
