import mongoose from 'mongoose';

const activeSessionSchema = new mongoose.Schema({
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    email:    { type: String, required: true },
    fullName: { type: String, default: '' },
    role:     { type: String, default: '' },
    loginAt:  { type: Date, default: Date.now },
}, { timestamps: false });

activeSessionSchema.index({ userId: 1 }, { unique: true });

export default mongoose.model('ActiveSession', activeSessionSchema);
