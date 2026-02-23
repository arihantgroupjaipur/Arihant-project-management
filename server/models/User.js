import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({

    fullName: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    phone: {
        type: String,
        required: true,
        trim: true,
    },
    employeeId: {
        type: String,
        trim: true,
    },
    password: {
        type: String,
        required: function () { return !this.googleId && !this.githubId; }, // Password required only if social login is not used
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true, // Allow multiple null values
    },
    githubId: {
        type: String,
        unique: true,
        sparse: true,
    },
    role: {
        type: String,
        enum: ['admin', 'engineer', 'project_manager', 'purchase_manager', 'account_manager'],
        default: 'engineer',
    },
    status: {
        type: String,
        enum: ['active', 'suspended', 'deactivated', 'pending'],
        default: 'pending',
    },
    otp: {
        type: String,
        select: false, // Don't return OTP in queries by default
    },
    otpExpires: {
        type: Date,
        select: false,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
