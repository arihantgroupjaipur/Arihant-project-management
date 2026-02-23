import express from 'express';
import WorkCompletion from '../models/WorkCompletion.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// @route   GET /api/workcompletions
// @desc    Get all work completions
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
    try {
        const workCompletions = await WorkCompletion.find()
            .populate('createdBy', 'fullName email')
            .sort({ createdAt: -1 });
        res.json(workCompletions);
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
            createdBy: req.user.id,
        });

        await workCompletion.save();
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
                }
            },
            { new: true, runValidators: false }
        );

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
        res.json({ message: 'Work Completion deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;
