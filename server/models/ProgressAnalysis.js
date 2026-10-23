import mongoose from 'mongoose';

const progressAnalysisSchema = new mongoose.Schema({
    period: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
    site: { type: String, default: null },
    from: { type: String, required: true },
    to: { type: String, required: true },
    entryCount: { type: Number, default: 0 },

    summary: { type: String, trim: true },
    underperformers: [{
        name: { type: String, trim: true },
        role: { type: String, trim: true },
        issue: { type: String, trim: true },
        evidence: { type: String, trim: true },
    }],
    discrepancies: [{
        area: { type: String, trim: true },
        expected: { type: String, trim: true },
        actual: { type: String, trim: true },
        note: { type: String, trim: true },
    }],
    recommendations: [{
        priority: { type: String, trim: true },
        action: { type: String, trim: true },
    }],

    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
    },
}, { timestamps: true });

export default mongoose.model('ProgressAnalysis', progressAnalysisSchema);
