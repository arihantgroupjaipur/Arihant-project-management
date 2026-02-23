import mongoose from 'mongoose';

const indentSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    indentNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    taskReference: {
        type: String,
        default: '',
        trim: true,
    },
    siteEngineerName: {
        type: String,
        required: true,
        trim: true,
    },
    materialGroup: {
        type: String, // Dropdown: Civil, Electrical, etc.
        required: true,
        trim: true,
    },
    siteName: {
        type: String,
        required: true,
        trim: true,
    },
    workDescription: { // Replaces blockFloorWork in UI context, but we can keep both or map
        type: String,
        required: true,
        trim: true,
    },
    blockFloorWork: { // Work for Block & Floor - Specific location
        type: String,
        trim: true,
    },
    leadTime: {
        type: Number, // "In how many days do you require this item"
        required: true,
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        default: 'Medium',
    },
    items: [{
        materialDescription: { type: String, required: true },
        unit: { type: String, required: true },
        requiredQuantity: { type: String, required: true },
        orderQuantity: { type: String, default: '' }, // Likely filled later or optional
        remark: String
    }],
    storeManagerName: {
        type: String,
        default: '',
    },
    storeManagerSignature: {
        type: String,
        default: '',
    },
    siteEngineerSignature: {
        type: String,
        default: '',
    },
    itemListFile: { // Optional now if using table
        type: String,
        default: '',
    },
    verifiedByPurchaseManager: {
        type: Boolean,
        default: false,
    },
    verifiedPdfUrl: {
        type: String,
        default: '',
    },
    status: {
        type: String,
        enum: ['Pending', 'Processing', 'Completed', 'Rejected'],
        default: 'Pending',
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, { timestamps: true });

const Indent = mongoose.model('Indent', indentSchema);
export default Indent;
