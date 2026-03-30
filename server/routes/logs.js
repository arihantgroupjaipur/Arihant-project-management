import express from 'express';
import ActivityLog from '../models/ActivityLog.js';
import ActiveSession from '../models/ActiveSession.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { logActivity } from '../utils/activityLogger.js';

const router = express.Router();

// GET /api/logs — fetch recent logs (newest first, paginated)
router.get('/', authMiddleware, async (req, res) => {
    if (req.user.role !== 'super-admin') {
        return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }
    try {
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(200, parseInt(req.query.limit) || 50);
        const skip  = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            ActivityLog.find()
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            ActivityLog.countDocuments(),
        ]);

        res.json({ logs, total, page, pages: Math.ceil(total / limit) });
    } catch (err) {
        console.error('[Logs] GET error:', err);
        res.status(500).json({ message: 'Failed to fetch logs' });
    }
});

// DELETE /api/logs — clear all logs (super-admin only)
router.delete('/', authMiddleware, async (req, res) => {
    if (req.user.role !== 'super-admin') {
        return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }
    try {
        await ActivityLog.deleteMany({});
        res.json({ message: 'All logs cleared' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to clear logs' });
    }
});

// GET /api/logs/sessions — all currently logged-in users (super_admin only)
router.get('/sessions', authMiddleware, async (req, res) => {
    if (req.user.role !== 'super-admin') {
        return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }
    try {
        const sessions = await ActiveSession.find().sort({ loginAt: -1 }).lean();
        res.json({ sessions });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch sessions' });
    }
});

// DELETE /api/logs/sessions/:userId — force-logout a user (super-admin only)
router.delete('/sessions/:userId', authMiddleware, async (req, res) => {
    if (req.user.role !== 'super-admin') {
        return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }
    if (req.user.id === req.params.userId) {
        return res.status(400).json({ message: 'You cannot force-logout yourself.' });
    }
    try {
        const session = await ActiveSession.findOneAndDelete({ userId: req.params.userId });
        if (!session) {
            return res.status(404).json({ message: 'No active session found for this user.' });
        }
        logActivity('OTHER', 'Auth', `Force-logout by super-admin for: ${session.email}`, req.user?.email, session.email);
        res.json({ message: `${session.email} has been logged out.` });
    } catch (err) {
        res.status(500).json({ message: 'Failed to force-logout user' });
    }
});

export default router;
