import express from 'express';
import PurchaseOrder from '../models/PurchaseOrder.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();
const authenticate = authMiddleware;

// Create PO
router.post('/', authenticate, async (req, res) => {
    try {
        const newPO = new PurchaseOrder({
            ...req.body,
            createdBy: req.user.id || req.user._id
        });

        const savedPO = await newPO.save();

        // Populate indentReference before returning to get indentNumber
        const populatedPO = await PurchaseOrder.findById(savedPO._id).populate('indentReference');
        res.status(201).json(populatedPO);
    } catch (error) {
        console.error("Error creating PO:", error);
        if (error.code === 11000) {
            return res.status(409).json({ message: `Purchase Order number "${error.keyValue?.poNumber || ''}" already exists. Please use a different number.` });
        }
        res.status(500).json({ message: error.message });
    }
});

// Get all POs
router.get('/', authenticate, async (req, res) => {
    try {
        const pos = await PurchaseOrder.find().populate('indentReference').sort({ createdAt: -1 });
        res.status(200).json(pos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get PO by ID
router.get('/:id', authenticate, async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id).populate('indentReference');
        if (!po) return res.status(404).json({ message: 'Purchase Order not found.' });
        res.status(200).json(po);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Reset (Delete) only Material Verification data — PO itself is NOT deleted
router.delete('/:id/verify', authenticate, async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id);
        if (!po) return res.status(404).json({ message: 'Purchase Order not found' });

        // Reset all verification fields
        po.maalPraptiRasidUrl = null;
        po.materialVerificationStatus = 'Pending';
        po.items.forEach(item => {
            item.receivedQuantity = 0;
        });

        await po.save();
        const updatedPO = await PurchaseOrder.findById(po._id).populate('indentReference');
        res.status(200).json(updatedPO);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update PO Material Verification
router.put('/:id/verify', authenticate, async (req, res) => {
    try {
        const { items, maalPraptiRasidUrl } = req.body;
        const po = await PurchaseOrder.findById(req.params.id);
        if (!po) return res.status(404).json({ message: 'Purchase Order not found' });

        if (maalPraptiRasidUrl !== undefined) {
            po.maalPraptiRasidUrl = maalPraptiRasidUrl;
        }

        if (items && Array.isArray(items)) {
            items.forEach(reqItem => {
                const poItem = po.items.id(reqItem._id);
                if (poItem) {
                    poItem.receivedQuantity = Number(reqItem.receivedQuantity) || 0;
                }
            });
        }

        let totalOrdered = 0;
        let totalReceived = 0;

        po.items.forEach(item => {
            totalOrdered += Number(item.quantity) || 0;
            totalReceived += Number(item.receivedQuantity) || 0;
        });

        if (totalReceived === 0) {
            po.materialVerificationStatus = 'Pending';
        } else if (totalReceived >= totalOrdered) {
            po.materialVerificationStatus = 'Verified';
        } else {
            po.materialVerificationStatus = 'Partial';
        }

        await po.save();
        const updatedPO = await PurchaseOrder.findById(po._id).populate('indentReference');
        res.status(200).json(updatedPO);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update PO
router.put('/:id', authenticate, async (req, res) => {
    try {
        const updatedPO = await PurchaseOrder.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        ).populate('indentReference');

        if (!updatedPO) return res.status(404).json({ message: 'Purchase Order not found' });
        res.status(200).json(updatedPO);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Purchase Order number already exists.' });
        }
        res.status(500).json({ message: error.message });
    }
});

// Delete PO
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const deletedPO = await PurchaseOrder.findByIdAndDelete(req.params.id);
        if (!deletedPO) return res.status(404).json({ message: 'Purchase Order not found' });
        res.status(200).json({ message: 'Purchase Order deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
