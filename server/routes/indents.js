import express from 'express';
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
        // Fire notification (non-blocking)        
        res.status(201).json(savedIndent);
    } catch (error) {
        console.error("Error creating indent:", error);
        if (error.code === 11000) {
            return res.status(409).json({ message: `Indent number "${error.keyValue?.indentNumber}" already exists. Please use a different indent number.` });
        }
        res.status(500).json({ message: error.message });
    }
});

// Get all Indents
router.get('/', authenticate, async (req, res) => {
    try {
        let query = {};
        if (req.query.siteName) {
            query.siteName = req.query.siteName;
        }

        const indents = await Indent.find(query)
            .populate('createdBy', 'fullName email')
            .populate('verifiedBy', 'fullName email')
            .sort({ createdAt: -1 });
        res.status(200).json(indents);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update an Indent
router.put('/:id', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Only admins can edit indents.' });
        }

        const indentId = req.params.id;
        const updateData = req.body;

        const updatedIndent = await Indent.findByIdAndUpdate(indentId, updateData, { new: true, runValidators: true });

        if (!updatedIndent) {
            return res.status(404).json({ message: 'Indent not found' });
        }

        res.json(updatedIndent);
    } catch (error) {
        console.error("Error updating indent:", error);
        res.status(500).json({ message: error.message });
    }
});

// Verify an Indent
router.put('/:id/verify', authenticate, upload.single('verifiedPdf'), async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'purchase_manager') {
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

        res.json(updatedIndent);
    } catch (error) {
        console.error("Error verifying indent:", error);
        res.status(500).json({ message: error.message });
    }
});

// Delete an Indent
router.delete('/:id', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Only admins can delete indents.' });
        }

        const indentId = req.params.id;
        const deletedIndent = await Indent.findByIdAndDelete(indentId);

        if (!deletedIndent) {
            return res.status(404).json({ message: 'Indent not found' });
        }

        res.json({ message: 'Indent deleted successfully' });
    } catch (error) {
        console.error("Error deleting indent:", error);
        res.status(500).json({ message: error.message });
    }
});

export default router;
