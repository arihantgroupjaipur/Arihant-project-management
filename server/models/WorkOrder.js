import mongoose from 'mongoose';

const workItemSchema = new mongoose.Schema({
    workDescription: {
        type: String,
        required: true,
    },
    plannedLabour: {
        type: Number,
        required: true,
    },
    workStartDate: {
        type: Date,
        required: true,
    },
    workFinishDate: {
        type: Date,
        required: true,
    },
    workArea: {
        type: Number,
        required: true,
    },
    rate: {
        type: Number,
        required: true,
    },
    totalAmount: {
        type: Number,
        required: true,
    },
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
    addressLocation: {
        type: String,
        required: true,
    },
    contactPersonName: {
        type: String,
        required: true,
    },
    workLocationName: {
        type: String,
        required: true,
    },
    storeKeeperSupervisorName: {
        type: String,
        default: '',
    },
    workItems: [workItemSchema],
    signatures: {
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
