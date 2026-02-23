import mongoose from 'mongoose';

const labourDetailSchema = new mongoose.Schema({
    contractorName: { type: String, required: true },
    plannedLabour: { type: Number, required: true },
    actualLabour: { type: Number, required: true },
});

const entrySchema = new mongoose.Schema({
    date: { type: String, required: true },
    projectName: { type: String, required: true },
    location: { type: String, required: true },
    supervisor: { type: String, required: true },
    status: { type: String, default: 'active' }, // Although status UI is removed, keeping in DB is fine or can check user preference. User asked to remove status sections, but maybe kept in backend for logic? I'll keep it as optional or default.
    workerCount: { type: Number, default: 0 },
    labourDetails: [labourDetailSchema],
    dailyProgressReports: [{
        contractorName: { type: String, default: '' },
        workOrderNo: { type: String, default: '' },
        plannedLabour: { type: Number, default: 0 },
        actualLabour: { type: Number, default: 0 },
        plannedWork: { type: String, default: '' },
        actualWork: { type: String, default: '' },
        status: { type: String, default: '' },
    }],
    materialConsumption: [{
        materialName: { type: String, required: true },
        totalQuantity: { type: Number, required: true },
        unit: { type: String, required: true },
        workOrderReference: { type: String, default: '' },
    }],
}, { timestamps: true });

const Entry = mongoose.model('Entry', entrySchema);
export default Entry;
