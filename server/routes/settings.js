import express from 'express';
import Setting from '../models/Setting.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// protect all routes
router.use(authMiddleware);

// Get a setting by key
router.get('/:key', async (req, res) => {
    try {
        const setting = await Setting.findOne({ key: req.params.key });
        if (!setting) {
            return res.status(404).json({ message: 'Setting not found' });
        }
        res.json({ key: setting.key, value: setting.value });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update or create a setting (Admin only)
router.put('/:key', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin role required.' });
        }

        const { value, description } = req.body;
        const key = req.params.key;

        const updatedSetting = await Setting.findOneAndUpdate(
            { key },
            { value, description },
            { new: true, upsert: true }
        );

        res.json({ key: updatedSetting.key, value: updatedSetting.value });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
