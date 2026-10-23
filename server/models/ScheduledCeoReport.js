import mongoose from 'mongoose';

const scheduledCeoReportSchema = new mongoose.Schema({
    period: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
    site: { type: String, default: null },
    ceoEmail: { type: String, required: true, trim: true },
    scheduledFor: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    sentAt: { type: Date, default: null },
    error: { type: String, default: null },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
    },
}, { timestamps: true });

export default mongoose.model('ScheduledCeoReport', scheduledCeoReportSchema);
