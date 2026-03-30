import express from 'express';
import { syncAllIndentsToSheet } from '../utils/googleSheetsService.js';
import { logActivity } from '../utils/activityLogger.js';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import s3 from '../config/s3.js';
import Indent from '../models/Indent.js';
import authMiddleware from '../middleware/authMiddleware.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Middleware to check authentication
const authenticate = authMiddleware;

// Configure Multer S3 Storage for Verified PDFs
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            const fileName = `indents/verified/${Date.now().toString()}-${file.originalname}`;
            cb(null, fileName);
        }
    })
});

// Create a new Indent
router.post('/', authenticate, async (req, res) => {
    try {
        const {
            date,
            indentNumber,
            taskReference,
            siteEngineerName,
            materialGroup,
            siteName,
            workDescription,
            blockFloorWork,
            leadTime,
            priority,
            items,
            storeManagerName,
            itemListFile,
            storeManagerSignature,
            siteEngineerSignature,
        } = req.body;

        const newIndent = new Indent({
            date,
            indentNumber,
            taskReference,
            siteEngineerName,
            materialGroup,
            siteName,
            workDescription,
            blockFloorWork,
            leadTime,
            priority,
            items,
            storeManagerName,
            itemListFile,
            storeManagerSignature: storeManagerSignature || '',
            siteEngineerSignature: siteEngineerSignature || '',
            createdBy: req.user.id || req.user._id,
        });

        const savedIndent = await newIndent.save();
        syncAllIndentsToSheet().catch(err => console.error('Sheet Sync Error:', err));
        logActivity('CREATE', 'Indent', `Indent created: ${savedIndent.indentNumber}`, req.user?.email, savedIndent.indentNumber);
        res.status(201).json(savedIndent);
    } catch (error) {
        console.error("Error creating indent:", error);
        if (error.code === 11000) {
            return res.status(409).json({ message: `Indent number "${error.keyValue?.indentNumber}" already exists. Please use a different indent number.` });
        }
        res.status(500).json({ message: error.message });
    }
});

// Get all Indents (with pagination, search, and filter)
router.get('/', authenticate, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, Math.min(200, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;
        const search = req.query.search?.trim() || '';
        const priority = req.query.priority?.trim() || '';
        const status = req.query.status?.trim() || ''; // 'verified' | 'unverified'

        const query = {};

        if (req.query.siteName) query.siteName = req.query.siteName;
        if (priority && priority !== 'all') query.priority = priority;
        if (status === 'verified') query.verifiedByPurchaseManager = true;
        if (status === 'unverified') query.verifiedByPurchaseManager = false;

        if (search) {
            query.$or = [
                { indentNumber: { $regex: search, $options: 'i' } },
                { siteName: { $regex: search, $options: 'i' } },
                { siteEngineerName: { $regex: search, $options: 'i' } },
                { workDescription: { $regex: search, $options: 'i' } },
            ];
        }

        const [indents, total] = await Promise.all([
            Indent.find(query)
                .populate('createdBy', 'fullName email')
                .populate('verifiedBy', 'fullName email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Indent.countDocuments(query),
        ]);

        res.status(200).json({ indents, total, page, limit, hasMore: skip + indents.length < total });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// Update an Indent
router.put('/:id', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'super-admin') {
            return res.status(403).json({ message: 'Access denied. Only admins can edit indents.' });
        }

        const indentId = req.params.id;
        const updateData = req.body;

        const updatedIndent = await Indent.findByIdAndUpdate(indentId, updateData, { new: true, runValidators: true });

        if (!updatedIndent) {
            return res.status(404).json({ message: 'Indent not found' });
        }

        syncAllIndentsToSheet().catch(err => console.error('Sheet Sync Error:', err));
        logActivity('UPDATE', 'Indent', `Indent updated: ${updatedIndent.indentNumber}`, req.user?.email, updatedIndent.indentNumber);
        res.json(updatedIndent);
    } catch (error) {
        console.error("Error updating indent:", error);
        res.status(500).json({ message: error.message });
    }
});

// Verify an Indent
router.put('/:id/verify', authenticate, upload.single('verifiedPdf'), async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'super-admin' && req.user.role !== 'purchase_manager') {
            return res.status(403).json({ message: 'Access denied. Only admins or purchase managers can verify indents.' });
        }

        const indentId = req.params.id;
        const { verifiedByPurchaseManager } = req.body;

        const isVerified = verifiedByPurchaseManager === 'true' || verifiedByPurchaseManager === true;
        const updateData = {
            verifiedByPurchaseManager: isVerified,
            verifiedBy: isVerified ? req.user.id : null
        };

        if (req.file) {
            // If there's an existing PDF, delete it from S3 first
            const existingIndent = await Indent.findById(indentId);
            if (existingIndent?.verifiedPdfUrl) {
                try {
                    await s3.send(new DeleteObjectCommand({
                        Bucket: process.env.AWS_BUCKET_NAME,
                        Key: existingIndent.verifiedPdfUrl,
                    }));
                } catch (deleteErr) {
                    console.warn('Could not delete old PDF from S3:', deleteErr.message);
                }
            }
            updateData.verifiedPdfUrl = req.file.key; // S3 key (use signed URL to access)
        }

        const updatedIndent = await Indent.findByIdAndUpdate(indentId, updateData, { new: true, runValidators: true });

        if (!updatedIndent) {
            return res.status(404).json({ message: 'Indent not found' });
        }

        syncAllIndentsToSheet().catch(err => console.error('Sheet Sync Error:', err));
        res.json(updatedIndent);
    } catch (error) {
        console.error("Error verifying indent:", error);
        res.status(500).json({ message: error.message });
    }
});

// Delete an Indent
router.delete('/:id', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'super-admin') {
            return res.status(403).json({ message: 'Access denied. Only admins can delete indents.' });
        }

        const indentId = req.params.id;
        const deletedIndent = await Indent.findByIdAndDelete(indentId);

        if (!deletedIndent) {
            return res.status(404).json({ message: 'Indent not found' });
        }

        syncAllIndentsToSheet().catch(err => console.error('Sheet Sync Error:', err));
        logActivity('DELETE', 'Indent', `Indent deleted: ${deletedIndent.indentNumber}`, req.user?.email, deletedIndent.indentNumber);
        res.json({ message: 'Indent deleted successfully' });
    } catch (error) {
        console.error("Error deleting indent:", error);
        res.status(500).json({ message: error.message });
    }
});

export default router;
