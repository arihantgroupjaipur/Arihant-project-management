import express from 'express';
import SiteLookup from '../models/SiteLookup.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();
const authenticate = authMiddleware;

const adminOrPurchaseManagerOnly = (req, res, next) => {
    if (req.user?.role !== 'admin' && req.user?.role !== 'purchase_manager') {
        return res.status(403).json({ message: 'Access denied: Requires Admin or Purchase Manager role.' });
    }
    next();
};

// GET /api/site-lookups?type=siteName
router.get('/', authenticate, async (req, res) => {
    try {
        const query = req.query.type ? { type: req.query.type } : {};
        const items = await SiteLookup.find(query).sort({ value: 1 });
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/site-lookups
router.post('/', authenticate, adminOrPurchaseManagerOnly, async (req, res) => {
    try {
        const { type, value, vendorAddress, vendorGst, vendorContactNo } = req.body;
        if (!type || !value) return res.status(400).json({ message: 'type and value are required' });
        const item = await SiteLookup.create({ type, value, vendorAddress, vendorGst, vendorContactNo });
        res.status(201).json(item);
    } catch (err) {
        if (err.code === 11000) return res.status(409).json({ message: 'This value already exists.' });
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/site-lookups/:id
router.put('/:id', authenticate, adminOrPurchaseManagerOnly, async (req, res) => {
    try {
        const { value, vendorAddress, vendorGst, vendorContactNo } = req.body;
        const updated = await SiteLookup.findByIdAndUpdate(
            req.params.id,
            { value, vendorAddress, vendorGst, vendorContactNo },
            { new: true, runValidators: true }
        );
        if (!updated) return res.status(404).json({ message: 'Not found' });
        res.json(updated);
    } catch (err) {
        if (err.code === 11000) return res.status(409).json({ message: 'This value already exists.' });
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/site-lookups/:id
router.delete('/:id', authenticate, adminOrPurchaseManagerOnly, async (req, res) => {
    try {
        await SiteLookup.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
