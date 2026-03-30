import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
    action: {
        type: String,
        enum: ['CREATE', 'UPDATE', 'DELETE', 'VERIFY', 'LOGIN', 'OTHER'],
        required: true,
    },
    module: {
        type: String,
        enum: ['Task', 'Indent', 'Purchase Order', 'Work Order', 'Work Completion', 'Daily Progress', 'User', 'Auth', 'Bill', 'PaymentVoucher', 'Other'],
        required: true,
    },
    description: { type: String, required: true },
    performedBy: { type: String, default: 'System' },
    ref: { type: String, default: '' },   // e.g. PO number, Task ID, etc.
}, { timestamps: true });

activityLogSchema.index({ createdAt: -1 });

export default mongoose.model('ActivityLog', activityLogSchema);
