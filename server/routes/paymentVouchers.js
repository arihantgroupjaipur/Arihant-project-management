import express from 'express';
import PaymentVoucher from '../models/PaymentVoucher.js';
import authMiddleware from '../middleware/authMiddleware.js';
import adminMiddleware from '../middleware/adminMiddleware.js';
import { logActivity } from '../utils/activityLogger.js';

const router = express.Router();

async function generateVoucherNumber() {
    const last = await PaymentVoucher.findOne().sort({ createdAt: -1 }).lean();
    if (!last || !last.voucherNumber) return 'PV-001';
    const num = parseInt(last.voucherNumber.split('-')[1] || '0', 10);
    return `PV-${String(num + 1).padStart(3, '0')}`;
}

// GET /api/payment-vouchers
router.get('/', authMiddleware, async (req, res) => {
    try {
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 20);
        const skip  = (page - 1) * limit;
        const [vouchers, total] = await Promise.all([
            PaymentVoucher.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate('createdBy', 'fullName'),
            PaymentVoucher.countDocuments(),
        ]);
        res.json({ vouchers, total, page, hasMore: skip + vouchers.length < total });
    } catch {
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /api/payment-vouchers
router.post('/', authMiddleware, async (req, res) => {
    try {
        const voucherNumber = req.body.voucherNumber?.trim() || await generateVoucherNumber();
        const voucher = await PaymentVoucher.create({ ...req.body, voucherNumber, createdBy: req.user?.id });
        logActivity('CREATE', 'PaymentVoucher', `Payment Voucher created: ${voucherNumber} for ${voucher.partyName}`, req.user?.email, String(voucher._id));
        res.json(voucher);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// PUT /api/payment-vouchers/:id
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const voucher = await PaymentVoucher.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
        if (!voucher) return res.status(404).json({ message: 'Voucher not found' });
        logActivity('UPDATE', 'PaymentVoucher', `Payment Voucher updated: ${voucher.voucherNumber}`, req.user?.email, String(voucher._id));
        res.json(voucher);
    } catch {
        res.status(500).json({ message: 'Server Error' });
    }
});

// DELETE /api/payment-vouchers/:id
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const voucher = await PaymentVoucher.findByIdAndDelete(req.params.id);
        if (!voucher) return res.status(404).json({ message: 'Voucher not found' });
        logActivity('DELETE', 'PaymentVoucher', `Payment Voucher deleted: ${voucher.voucherNumber}`, req.user?.email, String(voucher._id));
        res.json({ message: 'Voucher removed' });
    } catch {
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;
