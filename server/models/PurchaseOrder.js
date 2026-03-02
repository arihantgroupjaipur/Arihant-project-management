import mongoose from 'mongoose';

const purchaseOrderSchema = new mongoose.Schema({
    poNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    indentReferences: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Indent',
        required: true
    }],
    taskReference: {
        type: String,
        required: true,
        trim: true,
    },

    // Vendor Details
    vendorName: {
        type: String,
        required: true,
        trim: true,
    },
    vendorAddress: { type: String, trim: true },
    vendorGst: { type: String, trim: true },
    vendorContactNo: { type: String, trim: true },

    // Ship To Details
    shipToCompanyName: {
        type: String,
        default: "ARIHANT DREAM INFRA PROJECTS LTD",
        trim: true
    },
    shipToAddress: { type: String, trim: true },
    shipToContactPerson: { type: String, trim: true },
    shipToContactNo: { type: String, trim: true },

    // Line Items
    items: [{
        materialDescription: { type: String, required: true },
        unit: { type: String, required: true },
        quantity: { type: Number, required: true },
        rate: { type: Number, required: true },
        baseAmount: { type: Number, required: true, default: 0 },
        taxAmount: { type: Number, default: 0 }, // URD / Taxes
        amount: { type: Number, required: true }, // Final Total for Item
        receivedQuantity: { type: Number, default: 0 } // Aggregate sum of all receipts
    }],

    // Delivery Receipts (Multiple partial material drops)
    receipts: [{
        date: { type: Date, default: Date.now },
        receivedBy: { type: String, trim: true },
        challanNumber: { type: String, trim: true },
        remarks: { type: String, trim: true },
        maalPraptiRasidUrl: { type: String }, // Individual challan photo
        items: [{
            materialDescription: { type: String, required: true }, // To match against PO items
            quantityReceived: { type: Number, required: true, default: 0 },
            qualityCheckRemarks: { type: String, trim: true },
            itemImageUrl: { type: String }
        }]
    }],

    // Summary & Totals
    subTotal: { type: Number, required: true, default: 0 },
    freight: { type: Number, default: 0 },
    totalAmount: {
        type: Number,
        required: true,
        default: 0
    },

    // Additional Info
    comments: { type: String, trim: true },
    termsAndConditions: { type: String, trim: true },

    // Authorizations
    preparedBy: { type: String, trim: true },
    requisitionedBy: { type: String, trim: true },
    verifiedBy: { type: String, trim: true },
    authorizedBy: { type: String, trim: true },

    // Quotations
    quotation1Url: { type: String },
    quotation2Url: { type: String },
    quotation3Url: { type: String },
    approvedQuotation: {
        type: String,
        enum: ['none', 'quotation1', 'quotation2', 'quotation3'],
        default: 'none'
    },
    maalPraptiRasidUrl: { type: String },
    uploadedPdf: { type: String, default: null },

    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending',
    },
    materialVerificationStatus: {
        type: String,
        enum: ['Pending', 'Partial', 'Verified'],
        default: 'Pending',
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    }
}, { timestamps: true });

export default mongoose.model('PurchaseOrder', purchaseOrderSchema);
