import express from 'express';
import Setting from '../models/Setting.js';
import authMiddleware from '../middleware/authMiddleware.js';
import {
    syncAllTasksToSheet,
    syncAllIndentsToSheet,
    syncAllPurchaseOrdersToSheet,
    syncAllWorkOrdersToSheet,
    syncAllWorkCompletionsToSheet,
    syncAllEntriesToSheet,
    syncAllBillsToSheet,
} from '../utils/googleSheetsService.js';

const SHEET_SYNC_MAP = {
    google_sheet_id: syncAllTasksToSheet,
    google_sheet_id_indents: syncAllIndentsToSheet,
    google_sheet_id_purchase_orders: syncAllPurchaseOrdersToSheet,
    google_sheet_id_work_orders: syncAllWorkOrdersToSheet,
    google_sheet_id_work_completions: syncAllWorkCompletionsToSheet,
    google_sheet_id_entries: syncAllEntriesToSheet,
    google_sheet_id_bills: syncAllBillsToSheet,
};

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
        if (req.user.role !== 'admin' && req.user.role !== 'super-admin') {
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

        // Trigger full sync for the module when sheet ID is saved
        const syncFn = SHEET_SYNC_MAP[key];
        if (syncFn) {
            syncFn().catch(err => console.error(`Auto-sync after sheet save (${key}):`, err));
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
