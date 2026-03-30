import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
    description: { type: String, default: '' },
    unit:        { type: String, default: '' },
    qty:         { type: Number, default: 0 },
    rate:        { type: Number, default: 0 },
}, { _id: false });

const paymentVoucherSchema = new mongoose.Schema({
    voucherNumber:   { type: String, default: '' },
    partyName:       { type: String, required: true },   // "Jhanwarmal"
    siteName:        { type: String, default: '' },       // "Arihant SKH"
    date:            { type: String, required: true },
    items:           [itemSchema],
    gstPercentage:   { type: Number, default: 0 },
    paymentTerms:    { type: String, default: '' },
    preparedBy:      { type: String, default: '' },
    authorisedBy:    { type: String, default: '' },
    accountsOfficer: { type: String, default: '' },
    status:          { type: String, enum: ['Draft', 'Approved', 'Paid'], default: 'Draft' },
    remarks:         { type: String, default: '' },
    createdBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

paymentVoucherSchema.index({ createdAt: -1 });

const PaymentVoucher = mongoose.model('PaymentVoucher', paymentVoucherSchema);
export default PaymentVoucher;
