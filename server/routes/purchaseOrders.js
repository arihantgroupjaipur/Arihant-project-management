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

        // Populate indentReferences before returning to get indentNumber
        const populatedPO = await PurchaseOrder.findById(savedPO._id).populate('indentReferences');
        res.status(201).json(populatedPO);
    } catch (error) {
        console.error("Error creating PO:", error);
        if (error.code === 11000) {
            return res.status(409).json({ message: `Purchase Order number "${error.keyValue?.poNumber || ''}" already exists. Please use a different number.` });
        }
        res.status(500).json({ message: error.message });
    }
});

// Get all POs (paginated)
router.get('/', authenticate, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, Math.min(200, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;
        const search = req.query.search?.trim() || '';
        const status = req.query.status?.trim() || '';

        const query = {};
        if (status && status !== 'all') query.materialVerificationStatus = status;
        if (search) {
            query.$or = [
                { poNumber: { $regex: search, $options: 'i' } },
                { vendorName: { $regex: search, $options: 'i' } },
                { vendorGst: { $regex: search, $options: 'i' } },
            ];
        }

        const [pos, total] = await Promise.all([
            PurchaseOrder.find(query)
                .populate('indentReferences')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            PurchaseOrder.countDocuments(query),
        ]);

        res.status(200).json({ purchaseOrders: pos, total, page, limit, hasMore: skip + pos.length < total });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// Get PO by ID
router.get('/:id', authenticate, async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id).populate('indentReferences');
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
        po.receipts = [];
        po.items.forEach(item => {
            item.receivedQuantity = 0;
        });

        await po.save();
        const updatedPO = await PurchaseOrder.findById(po._id).populate('indentReferences');
        res.status(200).json(updatedPO);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add a partial Delivery Receipt
router.put('/:id/verify', authenticate, async (req, res) => {
    try {
        const { items, maalPraptiRasidUrl, receivedBy, challanNumber, remarks } = req.body;
        const po = await PurchaseOrder.findById(req.params.id);
        if (!po) return res.status(404).json({ message: 'Purchase Order not found' });

        // Build the receipt object
        if (items && Array.isArray(items) && items.some(i => Number(i.quantityReceived) > 0)) {
            const receiptItems = items.map(reqItem => {
                // We need the material description to store context in the receipt
                const poItem = po.items.id(reqItem._id);
                const desc = poItem ? poItem.materialDescription : "Unknown Item";
                return {
                    materialDescription: desc,
                    quantityReceived: Number(reqItem.quantityReceived) || 0,
                    qualityCheckRemarks: reqItem.qualityCheckRemarks || "",
                    itemImageUrl: reqItem.itemImageUrl || null
                };
            }).filter(i => i.quantityReceived > 0); // Only store items actually received in this drop

            if (receiptItems.length > 0) {
                po.receipts.push({
                    date: new Date(),
                    receivedBy: receivedBy || req.user?.fullName || "Unknown",
                    challanNumber: challanNumber || "",
                    remarks: remarks || "",
                    maalPraptiRasidUrl: maalPraptiRasidUrl || null,
                    items: receiptItems
                });
            }
        }

        // Keep the global `maalPraptiRasidUrl` as the LATEST receipt URL for backward compatibility
        // or just backward compat for existing logic if UI expects it at the top level.
        if (maalPraptiRasidUrl !== undefined && po.receipts.length > 0) {
            po.maalPraptiRasidUrl = maalPraptiRasidUrl;
        }

        // Update aggregate `receivedQuantity` on the PO items
        if (items && Array.isArray(items)) {
            items.forEach(reqItem => {
                const poItem = po.items.id(reqItem._id);
                if (poItem) {
                    poItem.receivedQuantity += (Number(reqItem.quantityReceived) || 0);
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
        const updatedPO = await PurchaseOrder.findById(po._id).populate('indentReferences');
        res.status(200).json(updatedPO);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update a specific Delivery Receipt
router.put('/:id/receipts/:receiptId', authenticate, async (req, res) => {
    try {
        const { items, maalPraptiRasidUrl, challanNumber, remarks } = req.body;
        const po = await PurchaseOrder.findById(req.params.id);
        if (!po) return res.status(404).json({ message: 'Purchase Order not found' });

        const receipt = po.receipts.id(req.params.receiptId);
        if (!receipt) return res.status(404).json({ message: 'Receipt not found' });

        // First, subtract the old receipt's quantities from the PO items
        if (receipt.items && Array.isArray(receipt.items)) {
            receipt.items.forEach(oldReceiptItem => {
                const poItem = po.items.find(pi => pi.materialDescription === oldReceiptItem.materialDescription);
                if (poItem) {
                    poItem.receivedQuantity = Math.max(0, (poItem.receivedQuantity || 0) - (oldReceiptItem.quantityReceived || 0));
                }
            });
        }

        // Now update the receipt fields
        if (challanNumber !== undefined) receipt.challanNumber = challanNumber;
        if (remarks !== undefined) receipt.remarks = remarks;
        if (maalPraptiRasidUrl !== undefined) receipt.maalPraptiRasidUrl = maalPraptiRasidUrl;

        // Update receipt items and add the new quantities to PO items
        if (items && Array.isArray(items)) {
            // Rebuild receipt items
            const newReceiptItems = items.map(reqItem => {
                const desc = reqItem.materialDescription || "Unknown Item";
                return {
                    materialDescription: desc,
                    quantityReceived: Number(reqItem.quantityReceived) || 0,
                    qualityCheckRemarks: reqItem.qualityCheckRemarks || "",
                    itemImageUrl: reqItem.itemImageUrl || null
                };
            }).filter(i => i.quantityReceived > 0);

            receipt.items = newReceiptItems;

            newReceiptItems.forEach(newReceiptItem => {
                const poItem = po.items.find(pi => pi.materialDescription === newReceiptItem.materialDescription);
                if (poItem) {
                    poItem.receivedQuantity = (poItem.receivedQuantity || 0) + newReceiptItem.quantityReceived;
                }
            });
        }

        // Recalculate status
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
        const updatedPO = await PurchaseOrder.findById(po._id).populate('indentReferences');
        res.status(200).json(updatedPO);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete a specific Delivery Receipt
router.delete('/:id/receipts/:receiptId', authenticate, async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id);
        if (!po) return res.status(404).json({ message: 'Purchase Order not found' });

        const receipt = po.receipts.id(req.params.receiptId);
        if (!receipt) return res.status(404).json({ message: 'Receipt not found' });

        // Subtract the receipt's quantities from the PO items
        if (receipt.items && Array.isArray(receipt.items)) {
            receipt.items.forEach(receiptItem => {
                const poItem = po.items.find(pi => pi.materialDescription === receiptItem.materialDescription);
                if (poItem) {
                    poItem.receivedQuantity = Math.max(0, (poItem.receivedQuantity || 0) - (receiptItem.quantityReceived || 0));
                }
            });
        }

        // Remove the receipt
        po.receipts.pull(req.params.receiptId);

        // Recalculate status
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
        const updatedPO = await PurchaseOrder.findById(po._id).populate('indentReferences');
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
        ).populate('indentReferences');

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

// Attach or remove an uploaded PDF on a PO
router.patch('/:id/pdf', authenticate, async (req, res) => {
    try {
        const { uploadedPdf } = req.body;
        const updatedPO = await PurchaseOrder.findByIdAndUpdate(
            req.params.id,
            { uploadedPdf: uploadedPdf ?? null },
            { new: true }
        ).populate('indentReferences');
        if (!updatedPO) return res.status(404).json({ message: 'Purchase Order not found' });
        res.status(200).json(updatedPO);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
