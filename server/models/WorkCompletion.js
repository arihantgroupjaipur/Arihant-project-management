import mongoose from 'mongoose';

const workExecutionRowSchema = new mongoose.Schema({
    summary: {
        type: String,
        default: '',
    },
    startDate: {
        type: Date,
        default: null,
    },
    endDate: {
        type: Date,
        default: null,
    },
    timeDelay: {
        type: String,
        default: '',
    },
    actual: {
        type: String,
        default: '',
    },
    completionPercent: {
        type: Number,
        default: 0,
    },
});

const workCompletionSchema = new mongoose.Schema({
    workOrderNumber: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        required: true,
        default: Date.now,
    },
    blockTower: {
        type: String,
        required: true,
    },
    floorZoneUnit: {
        type: String,
        default: '',
    },
    workTrade: {
        type: String,
        default: '',
    },
    specificActivity: {
        type: String,
        default: '',
    },
    contractorName: {
        type: String,
        required: true,
    },
    billNo: {
        type: String,
        default: '',
    },
    engineerName: {
        type: String,
        default: '',
    },
    workStartDate: {
        type: Date,
        default: null,
    },
    workEndDate: {
        type: Date,
        default: null,
    },
    totalWorkDuration: {
        type: String,
        default: '',
    },
    workExecutionRows: [workExecutionRowSchema],
    materialsConsumed: [{
        materialName: { type: String, required: true },
        quantity: { type: Number, required: true },
        unit: { type: String, required: true }, // e.g., kg, bags, liters
        remark: { type: String, default: '' }
    }],
    preWorkChecklist: {
        materialsChecked: {
            type: Boolean,
            default: false,
        },
        linesLevelsMarkings: {
            type: Boolean,
            default: false,
        },
        servicesCoordinated: {
            type: Boolean,
            default: false,
        },
        surfacePrepared: {
            type: Boolean,
            default: false,
        },
    },
    duringWorkChecklist: {
        workmanshipQuality: {
            type: Boolean,
            default: false,
        },
        approvedMaterialRatio: {
            type: Boolean,
            default: false,
        },
        alignmentLevel: {
            type: Boolean,
            default: false,
        },
        safetyHousekeeping: {
            type: Boolean,
            default: false,
        },
    },
    postWorkChecklist: {
        finishingQuality: {
            type: Boolean,
            default: false,
        },
        noCracksLeakage: {
            type: Boolean,
            default: false,
        },
        curingDone: {
            type: Boolean,
            default: false,
        },
        debrisCleared: {
            type: Boolean,
            default: false,
        },
        finalPhotos: {
            type: Boolean,
            default: false,
        },
    },
    qcRemarks: {
        type: String,
        default: '',
    },
    checklistImages: {
        type: Map,
        of: String, // Store base64 images with keys like 'preWork_materialsChecked'
        default: {}
    },
    contractorSignature: {
        type: String, // base64 image
        default: null,
    },
    uploadedPdf: {
        type: String, // S3 key or URL for the scanned certification document
        default: null,
    },
    confirmationDate: {
        type: Date,
        default: Date.now,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, {
    timestamps: true,
});

const WorkCompletion = mongoose.model('WorkCompletion', workCompletionSchema);

export default WorkCompletion;
