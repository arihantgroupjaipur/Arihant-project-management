import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { readSheetAsObjects } from '../utils/googleSheetsService.js';
import { getBomForTask } from '../utils/procurementLookup.js';
import Negotiation from '../models/Negotiation.js';
import PurchaseOrder from '../models/PurchaseOrder.js';

const router = express.Router();

// Same permission tier as Purchase Order creation — reused, not a new permission
const procurementActionMiddleware = (req, res, next) => {
    const allowed = ['admin', 'super-admin', 'purchase_manager'];
    if (!req.user || !allowed.includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied. Only admins and purchase managers can manage negotiations.' });
    }
    next();
};

function filterRows(rows, search) {
    if (!search) return rows;
    const needle = search.toLowerCase();
    return rows.filter((row) => Object.values(row).some((v) => String(v).toLowerCase().includes(needle)));
}

// GET /api/procurement/boq?search= — read-only reference lookup against the BOQ/BOM Google Sheet
router.get('/boq', authMiddleware, async (req, res) => {
    try {
        const rows = await readSheetAsObjects('google_sheet_id_boq');
        res.json(filterRows(rows, req.query.search));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/procurement/ims?search= — read-only reference lookup against the IMS (inventory) Google Sheet
router.get('/ims', authMiddleware, async (req, res) => {
    try {
        const rows = await readSheetAsObjects('google_sheet_id_ims');
        res.json(filterRows(rows, req.query.search));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/procurement/boq-check?task=<Task.workParticulars> — BOM for the task, joined with current IMS stock
router.get('/boq-check', authMiddleware, async (req, res) => {
    try {
        const { task } = req.query;
        if (!task) return res.status(400).json({ message: 'task is required' });
        const result = await getBomForTask(task);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/procurement/negotiations/:purchaseOrderId — list negotiation rounds for a PO, oldest first
router.get('/negotiations/:purchaseOrderId', authMiddleware, async (req, res) => {
    try {
        const rounds = await Negotiation.find({ purchaseOrderReference: req.params.purchaseOrderId })
            .populate('negotiatedBy', 'fullName email')
            .sort({ round: 1 });
        res.json(rounds);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/procurement/negotiations — { purchaseOrderReference, vendorName, offerAmount, counterOfferAmount, notes }
router.post('/negotiations', authMiddleware, procurementActionMiddleware, async (req, res) => {
    try {
        const { purchaseOrderReference, vendorName, offerAmount, counterOfferAmount, notes } = req.body;
        if (!purchaseOrderReference) return res.status(400).json({ message: 'purchaseOrderReference is required' });

        const po = await PurchaseOrder.findById(purchaseOrderReference);
        if (!po) return res.status(404).json({ message: 'Purchase Order not found' });

        const priorCount = await Negotiation.countDocuments({ purchaseOrderReference });
        const round = await Negotiation.create({
            purchaseOrderReference,
            vendorName: vendorName || po.vendorName,
            round: priorCount + 1,
            offerAmount,
            counterOfferAmount,
            notes,
            negotiatedBy: req.user?.id,
        });

        // Advance the linked Indent(s)' procurement funnel stage — additive, doesn't touch the existing `status` field
        if (po.indentReferences?.length > 0) {
            const Indent = (await import('../models/Indent.js')).default;
            await Indent.updateMany(
                { _id: { $in: po.indentReferences }, procurementStage: { $nin: ['PO Raised', 'PO Sent', 'Delivered', 'Received', 'Closed'] } },
                { $set: { procurementStage: 'Negotiation' } }
            );
        }

        res.status(201).json(round);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
