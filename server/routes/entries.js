import express from 'express';
import Entry from '../models/Entry.js';
import authMiddleware from '../middleware/authMiddleware.js';
import adminMiddleware from '../middleware/adminMiddleware.js';

const router = express.Router();

// @route   GET /api/entries
// @desc    Get all entries
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
    try {
        const entries = await Entry.find().sort({ createdAt: -1 });
        res.json(entries);
    } catch (err) {
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
