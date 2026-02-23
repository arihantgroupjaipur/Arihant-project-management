import mongoose from 'mongoose';

const contractorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
}, { timestamps: true });

const Contractor = mongoose.model('Contractor', contractorSchema);
export default Contractor;
