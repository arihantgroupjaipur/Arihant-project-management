import express from 'express';
import WorkOrder from '../models/WorkOrder.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// @route   GET /api/workorders
// @desc    Get all work orders
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
    try {
        const workOrders = await WorkOrder.find()
            .populate('createdBy', 'fullName email')
            .sort({ createdAt: -1 });
        res.json(workOrders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET /api/workorders/:id
// @desc    Get single work order by ID
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const workOrder = await WorkOrder.findById(req.params.id)
            .populate('createdBy', 'fullName email');

        if (!workOrder) {
            return res.status(404).json({ message: 'Work Order not found' });
        }

        res.json(workOrder);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   POST /api/workorders
// @desc    Create a new work order
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
    try {
        const {
            workOrderNumber,
            date,
            mainWorkOrderReference,
            addressLocation,
            contactPersonName,
            workLocationName,
            storeKeeperSupervisorName,
            workItems,
            signatures,
        } = req.body;

        // Check if work order number already exists
        const existingWorkOrder = await WorkOrder.findOne({ workOrderNumber });
        if (existingWorkOrder) {
            return res.status(400).json({ message: 'Work Order Number already exists' });
        }

        const workOrder = new WorkOrder({
            workOrderNumber,
            date,
            mainWorkOrderReference,
            addressLocation,
            contactPersonName,
            workLocationName,
            storeKeeperSupervisorName,
            workItems,
            signatures,
            createdBy: req.user.id,
        });

        await workOrder.save();
        // Fire notification (non-blocking)
        res.status(201).json(workOrder);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   PUT /api/workorders/:id
// @desc    Update a work order
// @access  Private
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const {
            workOrderNumber,
            date,
            mainWorkOrderReference,
            addressLocation,
            contactPersonName,
            workLocationName,
            storeKeeperSupervisorName,
            workItems,
            signatures,
            uploadedPdf,
        } = req.body;

        let workOrder = await WorkOrder.findById(req.params.id);

        if (!workOrder) {
            return res.status(404).json({ message: 'Work Order not found' });
        }

        // Check if new work order number conflicts with existing
        if (workOrderNumber !== workOrder.workOrderNumber) {
            const existingWorkOrder = await WorkOrder.findOne({ workOrderNumber });
            if (existingWorkOrder) {
                return res.status(400).json({ message: 'Work Order Number already exists' });
            }
        }

        workOrder.workOrderNumber = workOrderNumber;
        workOrder.date = date;
        workOrder.mainWorkOrderReference = mainWorkOrderReference;
        workOrder.addressLocation = addressLocation;
        workOrder.contactPersonName = contactPersonName;
        workOrder.workLocationName = workLocationName;
        workOrder.storeKeeperSupervisorName = storeKeeperSupervisorName;
        workOrder.workItems = workItems;
        workOrder.signatures = signatures;
        if (uploadedPdf !== undefined) workOrder.uploadedPdf = uploadedPdf;

        await workOrder.save();
        res.json(workOrder);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   PATCH /api/workorders/:id/pdf
// @desc    Attach or remove an uploaded PDF on a work order
// @access  Private
router.patch('/:id/pdf', authMiddleware, async (req, res) => {
    try {
        const { uploadedPdf } = req.body;
        const workOrder = await WorkOrder.findByIdAndUpdate(
            req.params.id,
            { uploadedPdf: uploadedPdf ?? null },
            { new: true }
        );
        if (!workOrder) {
            return res.status(404).json({ message: 'Work Order not found' });
        }
        res.json(workOrder);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   DELETE /api/workorders/:id
// @desc    Delete a work order
// @access  Private (Admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const workOrder = await WorkOrder.findById(req.params.id);

        if (!workOrder) {
            return res.status(404).json({ message: 'Work Order not found' });
        }

        await WorkOrder.findByIdAndDelete(req.params.id);
        res.json({ message: 'Work Order deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;
