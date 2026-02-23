import mongoose from 'mongoose';

const qaqcSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
    },
    projectName: {
        type: String,
        required: true,
        trim: true,
    },
    location: {
        type: String,
        required: true,
        trim: true,
    },
    contractorName: {
        type: String,
        required: true,
        trim: true,
    },
    engineerName: {
        type: String,
        required: true,
        trim: true,
    },
    checklistItems: [{
        description: String,
        status: {
            type: String,
            enum: ['Pass', 'Fail', 'Pending'],
            default: 'Pending',
        },
        remarks: String,
    }],
    signatures: {
        contractor: String, // Base64 or URL
        engineer: String,   // Base64 or URL
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, { timestamps: true });

const QAQC = mongoose.model('QAQC', qaqcSchema);
export default QAQC;
