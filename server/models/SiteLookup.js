import mongoose from 'mongoose';

const siteLookupSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['siteName', 'siteEngineer', 'materialGroup', 'vendor'],
    },
    value: {
        type: String,
        required: true,
        trim: true,
    },
    vendorAddress: { type: String, trim: true },
    vendorGst: { type: String, trim: true },
    vendorContactNo: { type: String, trim: true },
}, { timestamps: true });

// Unique per type+value pair
siteLookupSchema.index({ type: 1, value: 1 }, { unique: true });

const SiteLookup = mongoose.model('SiteLookup', siteLookupSchema);
export default SiteLookup;
