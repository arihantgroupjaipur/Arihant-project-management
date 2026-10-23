import mongoose from 'mongoose';

const negotiationSchema = new mongoose.Schema({
    purchaseOrderReference: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PurchaseOrder',
        required: true,
    },
    vendorName: { type: String, trim: true },
    round: { type: Number, required: true },
    offerAmount: { type: Number },
    counterOfferAmount: { type: Number },
    notes: { type: String, trim: true },
    negotiatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
    },
}, { timestamps: true });

export default mongoose.model('Negotiation', negotiationSchema);
