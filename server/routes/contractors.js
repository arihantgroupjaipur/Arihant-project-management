import express from 'express';
import Contractor from '../models/Contractor.js';
import authMiddleware from '../middleware/authMiddleware.js';
import adminMiddleware from '../middleware/adminMiddleware.js';

const router = express.Router();

// @route   GET /api/contractors
// @desc    Get all contractors
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
    try {
        const contractors = await Contractor.find().sort({ createdAt: -1 });
        res.json(contractors);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/contractors
// @desc    Add a new contractor
// @access  Private (Admin only)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
    const { name } = req.body;

    try {
        let contractor = await Contractor.findOne({ name });
        if (contractor) {
            return res.status(400).json({ message: 'Contractor already exists' });
        }

        contractor = new Contractor({ name });
        await contractor.save();
        res.json(contractor);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/contractors/:id
// @desc    Update a contractor
// @access  Private (Admin only)
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    const { name } = req.body;
    try {
        let contractor = await Contractor.findById(req.params.id);
        if (!contractor) return res.status(404).json({ message: 'Contractor not found' });

        contractor.name = name;
        await contractor.save();
        res.json(contractor);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/contractors/:id
// @desc    Delete a contractor
// @access  Private (Admin only)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        let contractor = await Contractor.findById(req.params.id);
        if (!contractor) return res.status(404).json({ message: 'Contractor not found' });

        await Contractor.findByIdAndDelete(req.params.id);
        res.json({ message: 'Contractor removed' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

export default router;
