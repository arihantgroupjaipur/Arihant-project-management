import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { buildProgressReport, listSites } from '../utils/progressReportAggregator.js';
import ProgressAnalysis from '../models/ProgressAnalysis.js';

const router = express.Router();

// GET /api/reports/progress?period=daily|weekly|monthly&site=&from=&to=
router.get('/progress', authMiddleware, async (req, res) => {
    try {
        const { period = 'daily', site, from, to } = req.query;
        if (!['daily', 'weekly', 'monthly'].includes(period)) {
            return res.status(400).json({ message: 'period must be daily, weekly, or monthly' });
        }
        const report = await buildProgressReport({ period, site, from, to });
        res.json(report);
    } catch (error) {
        console.error('Progress report error:', error);
        res.status(500).json({ message: 'Failed to build progress report', error: error.message });
    }
});

// GET /api/reports/sites — distinct project/site names for the filter dropdown
router.get('/sites', authMiddleware, async (req, res) => {
    try {
        const sites = await listSites();
        res.json(sites);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch sites', error: error.message });
    }
});

// GET /api/reports/analysis-history?period=&site= — list past AI analyses, newest first
router.get('/analysis-history', authMiddleware, async (req, res) => {
    try {
        const { period, site } = req.query;
        const query = {};
        if (period) query.period = period;
        if (site) query.site = site;
        const history = await ProgressAnalysis.find(query).sort({ createdAt: -1 }).limit(100).lean();
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch analysis history', error: error.message });
    }
});

// GET /api/reports/analysis-history/:id — one saved analysis in full
router.get('/analysis-history/:id', authMiddleware, async (req, res) => {
    try {
        const analysis = await ProgressAnalysis.findById(req.params.id).lean();
        if (!analysis) return res.status(404).json({ message: 'Not found' });
        res.json(analysis);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch analysis', error: error.message });
    }
});

export default router;
