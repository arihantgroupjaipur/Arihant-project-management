import mongoose from 'mongoose';

const workItemSchema = new mongoose.Schema({
    workDescription: {
        type: String,
        required: true,
    },
    // "Floor" — from the Scope of Work table in the new printed Work Order format
    floor: {
        type: String,
        default: '',
    },
    workStartDate: {
        type: Date,
        required: true,
    },
    workFinishDate: {
        type: Date,
        required: true,
    },
    // "Revised Date" — from the Scope of Work table in the new printed Work Order format
    revisedDate: {
        type: Date,
        default: null,
    },
    // Kept for backward compatibility with existing data/integrations — no longer shown
    // on the new Work Order form/PDF, so made optional with safe defaults.
    plannedLabour: {
        type: Number,
        default: 0,
    },
    workArea: {
        type: Number,
        default: 0,
    },
    rate: {
        type: Number,
        default: 0,
    },
    totalAmount: {
        type: Number,
        default: 0,
    },
});

const referenceDrawingSchema = new mongoose.Schema({
    revisionDate: { type: String, default: '' },
    specification: { type: String, default: '' },
    attached: { type: String, enum: ['Y', 'N', ''], default: '' },
});

const workOrderSchema = new mongoose.Schema({
    workOrderNumber: {
        type: String,
        required: true,
        unique: true,
    },
    date: {
        type: Date,
        required: true,
        default: Date.now,
    },
    mainWorkOrderReference: {
        type: String,
        default: '',
    },
    taskReference: {
        type: String,
        default: '',
        trim: true,
    },
    // Kept optional for backward compatibility — the new Work Order form no longer shows these,
    // using projectName/siteLocation/issuedTo/supervisorForeman below instead.
    addressLocation: {
        type: String,
        default: '',
    },
    contactPersonName: {
        type: String,
        default: '',
    },
    workLocationName: {
        type: String,
        default: '',
    },
    storeKeeperSupervisorName: {
        type: String,
        default: '',
    },
    comments: {
        type: String,
        default: '',
    },

    // New header fields — match the printed Work Order format
    projectName: { type: String, default: '' },
    siteLocation: { type: String, default: '' },
    issuedBy: { type: String, default: '' },
    issuedTo: { type: String, default: '' },
    contractType: { type: String, default: '' }, // "Contract" field on the form
    block: { type: String, default: '' },
    startDate: { type: Date, default: null }, // overall contract start (distinct from per-item workStartDate)
    validTill: { type: Date, default: null },

    workItems: [workItemSchema],

    // "2. Reference Drawings / Specifications" table
    referenceDrawings: [referenceDrawingSchema],

    // "3. Resources to be Deployed"
    resources: {
        labourMason: { type: String, default: '' },
        labourBeldarCull: { type: String, default: '' },
        supervisorForeman: { type: String, default: '' },
        engineerInCharge: { type: String, default: '' },
        equipmentMachinery: { type: String, default: '' },
        materialIssued: { type: String, default: '' },
    },

    signatures: {
        // Kept for backward compatibility with existing records — no longer shown on the new form/PDF
        contractor: {
            type: String, // base64 image
            default: null,
        },
        engineer: {
            type: String, // base64 image
            default: null,
        },
        supervisor: {
            type: String, // base64 image
            default: null,
        },
        // New footer blocks — match "Prepared & Verified By / Accepted By / Authorized By"
        preparedVerifiedBy: {
            name: { type: String, default: '' },
            signature: { type: String, default: null },
            date: { type: Date, default: null },
        },
        acceptedBy: {
            name: { type: String, default: '' },
            signature: { type: String, default: null },
            date: { type: Date, default: null },
        },
        authorizedBy: {
            name: { type: String, default: '' },
            signature: { type: String, default: null },
            date: { type: Date, default: null },
        },
    },
    uploadedPdf: {
        type: String, // S3 key
        default: null,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, {
    timestamps: true,
});

const WorkOrder = mongoose.model('WorkOrder', workOrderSchema);

export default WorkOrder;
