import express from 'express';
import WorkOrder from '../models/WorkOrder.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { syncAllWorkOrdersToSheet } from '../utils/googleSheetsService.js';
import { logActivity } from '../utils/activityLogger.js';

const router = express.Router();

// @route   GET /api/workorders
// @desc    Get all work orders (paginated)
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, Math.min(200, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;
        const search = req.query.search?.trim() || '';

        const query = {};
        if (search) {
            query.$or = [
                { workOrderNumber: { $regex: search, $options: 'i' } },
                { workLocationName: { $regex: search, $options: 'i' } },
                { contactPersonName: { $regex: search, $options: 'i' } },
                { mainWorkOrderReference: { $regex: search, $options: 'i' } },
                { taskReference: { $regex: search, $options: 'i' } },
            ];
        }

        const [workOrders, total] = await Promise.all([
            WorkOrder.find(query)
                .populate('createdBy', 'fullName email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            WorkOrder.countDocuments(query),
        ]);

        res.json({ workOrders, total, page, limit, hasMore: skip + workOrders.length < total });
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
            taskReference,
            addressLocation,
            contactPersonName,
            workLocationName,
            storeKeeperSupervisorName,
            comments,
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
            taskReference,
            addressLocation,
            contactPersonName,
            workLocationName,
            storeKeeperSupervisorName,
            comments,
            workItems,
            signatures,
            createdBy: req.user.id,
        });

        await workOrder.save();
        syncAllWorkOrdersToSheet().catch(err => console.error('Sheet Sync Error:', err));
        logActivity('CREATE', 'Work Order', `Work Order created: ${workOrder.workOrderNumber}`, req.user?.email, workOrder.workOrderNumber);
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
            taskReference,
            addressLocation,
            contactPersonName,
            workLocationName,
            storeKeeperSupervisorName,
            comments,
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
        workOrder.taskReference = taskReference;
        workOrder.addressLocation = addressLocation;
        workOrder.contactPersonName = contactPersonName;
        workOrder.workLocationName = workLocationName;
        workOrder.storeKeeperSupervisorName = storeKeeperSupervisorName;
        if (comments !== undefined) workOrder.comments = comments;
        workOrder.workItems = workItems;
        workOrder.signatures = signatures;
        if (uploadedPdf !== undefined) workOrder.uploadedPdf = uploadedPdf;

        await workOrder.save();
        syncAllWorkOrdersToSheet().catch(err => console.error('Sheet Sync Error:', err));
        logActivity('UPDATE', 'Work Order', `Work Order updated: ${workOrder.workOrderNumber}`, req.user?.email, workOrder.workOrderNumber);
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
        syncAllWorkOrdersToSheet().catch(err => console.error('Sheet Sync Error:', err));
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
        syncAllWorkOrdersToSheet().catch(err => console.error('Sheet Sync Error:', err));
        logActivity('DELETE', 'Work Order', `Work Order deleted: ${workOrder.workOrderNumber}`, req.user?.email, workOrder.workOrderNumber);
        res.json({ message: 'Work Order deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;
