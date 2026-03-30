import mongoose from 'mongoose';

const billSchema = new mongoose.Schema({
    billNumber:      { type: String, required: true, unique: true },
    workOrderNumber: { type: String, default: '' },
    contractorName:  { type: String, required: true },
    description:     { type: String, default: '' },
    amount:          { type: Number, default: 0 },
    date:            { type: String, required: true },
    status:          { type: String, enum: ['Pending', 'Approved', 'Paid', 'Rejected'], default: 'Pending' },
    remarks:         { type: String, default: '' },
    attachments:     [{ key: { type: String }, name: { type: String } }],
    createdBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

billSchema.index({ createdAt: -1 });

const Bill = mongoose.model('Bill', billSchema);
export default Bill;
