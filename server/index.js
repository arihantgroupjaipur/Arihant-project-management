import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';


const app = express();
import passport from 'passport';
import './config/passport.js';

import authRoutes from './routes/auth.js';
import contractorRoutes from './routes/contractors.js';
import entryRoutes from './routes/entries.js';
import workOrderRoutes from './routes/workOrders.js';
import workCompletionRoutes from './routes/workCompletions.js';
import uploadRoutes from './routes/upload.js';
import taskRoutes from './routes/tasks.js';
import userRoutes from './routes/users.js';
import qaqcRoutes from './routes/qaqc.js';
import indentRoutes from './routes/indents.js';
import purchaseOrderRoutes from './routes/purchaseOrders.js';

app.use(passport.initialize());
const PORT = process.env.PORT || 5001;

// Middleware
const allowedOrigins = [
    'http://localhost:8080',
    'http://localhost:5173',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.some(o => origin.startsWith(o))) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/deployment-hub')
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/contractors', contractorRoutes);
app.use('/api/entries', entryRoutes);
app.use('/api/workorders', workOrderRoutes);
app.use('/api/workcompletions', workCompletionRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/qaqc', qaqcRoutes);
import siteLookupRoutes from './routes/siteLookups.js';
app.use('/api/indents', indentRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/site-lookups', siteLookupRoutes);
app.use('/api/users', userRoutes);
app.get('/', (req, res) => {
    res.send('Arihant Dream Infra Projects Limited API is running');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
