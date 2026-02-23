import express from 'express';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import s3 from '../config/s3.js';
import authMiddleware from '../middleware/authMiddleware.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Configure Multer S3 Storage — stores privately, no ACL
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            const fileName = `uploads/${Date.now().toString()}-${file.originalname}`;
            cb(null, fileName);
        }
    })
});

// POST /api/upload — Upload a file, returns the S3 key
router.post('/', authMiddleware, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        // Return the key (not the public URL) — use /signed-url to view the file
        res.json({
            key: req.file.key,
            public_id: req.file.key,
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
});

// GET /api/upload/signed-url?key=uploads/xxx — Generate a temporary pre-signed URL (1 hour)
router.get('/signed-url', authMiddleware, async (req, res) => {
    try {
        const { key } = req.query;
        if (!key) {
            return res.status(400).json({ message: 'S3 key is required' });
        }

        const command = new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
        });

        // URL expires in 1 hour (3600 seconds)
        const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

        res.json({ url });
    } catch (error) {
        console.error('Signed URL error:', error);
        res.status(500).json({ message: 'Failed to generate signed URL', error: error.message });
    }
});
// DELETE /api/upload?key=uploads/xxx — Delete a file from S3
router.delete('/', authMiddleware, async (req, res) => {
    try {
        const { key } = req.query;
        if (!key) {
            return res.status(400).json({ message: 'S3 key is required' });
        }

        const command = new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
        });

        await s3.send(command);
        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ message: 'Failed to delete file', error: error.message });
    }
});

export default router;
