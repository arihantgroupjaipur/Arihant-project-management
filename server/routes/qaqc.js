import express from 'express';
import QAQC from '../models/QAQC.js';
import passport from 'passport';

const router = express.Router();

// Middleware to check authentication
const authenticate = passport.authenticate('jwt', { session: false });

// Create a new QA/QC entry
router.post('/', authenticate, async (req, res) => {
    try {
        const { date, projectName, location, contractorName, checklistItems, signatures } = req.body;

        const newQAQC = new QAQC({
            date,
            projectName,
            location,
            contractorName,
            engineerName: req.user.fullName, // Engineer name from authenticated user
            checklistItems,
            signatures,
            createdBy: req.user._id,
        });

        const savedQAQC = await newQAQC.save();
        res.status(201).json(savedQAQC);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all QA/QC entries (optionally filter by project or user)
router.get('/', authenticate, async (req, res) => {
    try {
        let query = {};
        // If engineer, maybe only show their sites? For now show all or filter by query params
        if (req.query.projectName) {
            query.projectName = req.query.projectName;
        }

        const qaqcEntries = await QAQC.find(query).sort({ createdAt: -1 });
        res.status(200).json(qaqcEntries);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
