import express from 'express';
import WorkCompletion from '../models/WorkCompletion.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { syncAllWorkCompletionsToSheet } from '../utils/googleSheetsService.js';
import { logActivity } from '../utils/activityLogger.js';

const router = express.Router();

// @route   GET /api/workcompletions
// @desc    Get all work completions (paginated)
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
                { contractorName: { $regex: search, $options: 'i' } },
                { engineerName: { $regex: search, $options: 'i' } },
                { workTrade: { $regex: search, $options: 'i' } },
            ];
        }

        const [workCompletions, total] = await Promise.all([
            WorkCompletion.find(query)
                .populate('createdBy', 'fullName email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            WorkCompletion.countDocuments(query),
        ]);

        res.json({ workCompletions, total, page, limit, hasMore: skip + workCompletions.length < total });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});


// @route   GET /api/workcompletions/:id
// @desc    Get single work completion by ID
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const workCompletion = await WorkCompletion.findById(req.params.id)
            .populate('createdBy', 'fullName email');

        if (!workCompletion) {
            return res.status(404).json({ message: 'Work Completion not found' });
        }

        res.json(workCompletion);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   POST /api/workcompletions
// @desc    Create a new work completion
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
    try {
        const {
            workOrderNumber,
            date,
            blockTower,
            floorZoneUnit,
            workTrade,
            specificActivity,
            contractorName,
            billNo,
            engineerName,
            workStartDate,
            workEndDate,
            totalWorkDuration,
            workExecutionRows,
            preWorkChecklist,
            duringWorkChecklist,
            postWorkChecklist,
            qcRemarks,
            contractorSignature,
            confirmationDate,
            checklistImages, // Add this
            uploadedPdf,
        } = req.body;

        const workCompletion = new WorkCompletion({
            workOrderNumber,
            date,
            blockTower,
            floorZoneUnit,
            workTrade,
            specificActivity,
            contractorName,
            billNo,
            engineerName,
            workStartDate,
            workEndDate,
            totalWorkDuration,
            workExecutionRows,
            preWorkChecklist,
            duringWorkChecklist,
            postWorkChecklist,
            qcRemarks,
            contractorSignature,
            confirmationDate,
            checklistImages, // Add this
            uploadedPdf,
            createdBy: req.user.id,
        });

        await workCompletion.save();
        syncAllWorkCompletionsToSheet().catch(err => console.error('Sheet Sync Error:', err));
        logActivity('CREATE', 'Work Completion', `Work Completion created for WO: ${workCompletion.workOrderNumber}`, req.user?.email, workCompletion.workOrderNumber);
        res.status(201).json(workCompletion);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   PUT /api/workcompletions/:id
// @desc    Update a work completion
// @access  Private
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const {
            workOrderNumber,
            date,
            blockTower,
            floorZoneUnit,
            workTrade,
            specificActivity,
            contractorName,
            billNo,
            engineerName,
            workStartDate,
            workEndDate,
            totalWorkDuration,
            workExecutionRows,
            preWorkChecklist,
            duringWorkChecklist,
            postWorkChecklist,
            qcRemarks,
            contractorSignature,
            confirmationDate,
            checklistImages, // Add this
            uploadedPdf, // Add this
        } = req.body;

        let workCompletion = await WorkCompletion.findById(req.params.id);

        if (!workCompletion) {
            return res.status(404).json({ message: 'Work Completion not found' });
        }

        const updated = await WorkCompletion.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    workOrderNumber,
                    date,
                    blockTower,
                    floorZoneUnit,
                    workTrade,
                    specificActivity,
                    contractorName,
                    billNo,
                    engineerName,
                    workStartDate,
                    workEndDate,
                    totalWorkDuration,
                    workExecutionRows,
                    preWorkChecklist,
                    duringWorkChecklist,
                    postWorkChecklist,
                    qcRemarks,
                    contractorSignature,
                    confirmationDate,
                    checklistImages,
                    uploadedPdf,
                }
            },
            { new: true, runValidators: false }
        );

        syncAllWorkCompletionsToSheet().catch(err => console.error('Sheet Sync Error:', err));
        logActivity('UPDATE', 'Work Completion', `Work Completion updated for WO: ${updated.workOrderNumber}`, req.user?.email, updated.workOrderNumber);
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   DELETE /api/workcompletions/:id
// @desc    Delete a work completion
// @access  Private (Admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const workCompletion = await WorkCompletion.findById(req.params.id);

        if (!workCompletion) {
            return res.status(404).json({ message: 'Work Completion not found' });
        }

        await WorkCompletion.findByIdAndDelete(req.params.id);
        syncAllWorkCompletionsToSheet().catch(err => console.error('Sheet Sync Error:', err));
        logActivity('DELETE', 'Work Completion', `Work Completion deleted for WO: ${workCompletion.workOrderNumber}`, req.user?.email, workCompletion.workOrderNumber);
        res.json({ message: 'Work Completion deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;
