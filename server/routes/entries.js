import express from 'express';
import Entry from '../models/Entry.js';
import authMiddleware from '../middleware/authMiddleware.js';
import adminMiddleware from '../middleware/adminMiddleware.js';

const router = express.Router();

// @route   GET /api/entries
// @desc    Get all entries (paginated)
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
                { siteName: { $regex: search, $options: 'i' } },
                { supervisorName: { $regex: search, $options: 'i' } },
            ];
        }

        const [entries, total] = await Promise.all([
            Entry.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Entry.countDocuments(query),
        ]);

        res.json({ entries, total, page, limit, hasMore: skip + entries.length < total });
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});


// @route   GET /api/entries/work-order-usage/:workOrderNo
// @desc    Get total historical usage of actualLabour and actualWork for a specific work order across all daily progress reports
// @access  Private
router.get('/work-order-usage/:workOrderNo', authMiddleware, async (req, res) => {
    try {
        const { workOrderNo } = req.params;

        // Find all entries that have at least one report matching the workOrderNo
        const entries = await Entry.find({ "dailyProgressReports.workOrderNo": workOrderNo });

        let totalConsumedLabour = 0;
        let totalConsumedArea = 0;
        let consumedWorkDescriptions = [];

        entries.forEach(entry => {
            entry.dailyProgressReports.forEach(report => {
                if (report.workOrderNo === workOrderNo) {
                    totalConsumedLabour += (report.actualLabour || 0);

                    if (report.actualWork && report.actualWork.trim() !== '') {
                        const actualWorkStr = report.actualWork.trim();
                        consumedWorkDescriptions.push(actualWorkStr);

                        // Extract leading/floating numbers from actualWork text
                        // E.g. "50.5 sqft" -> 50.5
                        const parsedArea = parseFloat(actualWorkStr);
                        if (!isNaN(parsedArea)) {
                            totalConsumedArea += parsedArea;
                        }
                    }
                }
            });
        });

        // Optionally, compile the consumedWork into a distinct list or a joined string
        const combinedConsumedWork = [...new Set(consumedWorkDescriptions)].join(" | ");

        res.json({
            workOrderNo,
            totalConsumedLabour,
            totalConsumedArea,
            combinedConsumedWork,
            entryCount: entries.length
        });

    } catch (err) {
        console.error('Work order usage error:', err);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/entries
// @desc    Create a new entry
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
    try {
        const newEntry = new Entry(req.body);
        const entry = await newEntry.save();
        // Fire notification (non-blocking)
        res.json(entry);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/entries/:id
// @desc    Update an entry
// @access  Private
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        let entry = await Entry.findById(req.params.id);
        if (!entry) {
            return res.status(404).json({ message: 'Entry not found' });
        }

        entry = await Entry.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );
        res.json(entry);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/entries/:id
// @desc    Delete an entry
// @access  Private (Admin only)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const entry = await Entry.findById(req.params.id);
        if (!entry) {
            return res.status(404).json({ message: 'Entry not found' });
        }

        await Entry.findByIdAndDelete(req.params.id);
        res.json({ message: 'Entry removed' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

export default router;
