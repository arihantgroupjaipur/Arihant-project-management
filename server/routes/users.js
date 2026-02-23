import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Otp from '../models/Otp.js';
import authMiddleware from '../middleware/authMiddleware.js';
import adminMiddleware from '../middleware/adminMiddleware.js';
import { sendStatusChangeEmail, sendVerificationEmail } from '../utils/emailService.js';

const router = express.Router();

// Middleware to ensure only admins can access these routes
router.use(authMiddleware, adminMiddleware);

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Admin only)
router.get('/', async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/users/send-otp
// @desc    Send OTP to a new user email for verification by admin
// @access  Private (Admin only)
router.post('/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    try {
        const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: 'A user with this email already exists' });
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Remove any existing OTP for this email
        await Otp.deleteMany({ email: email.trim().toLowerCase() });

        // Save new OTP
        const newOtp = new Otp({
            email: email.trim().toLowerCase(),
            otp: otpCode
        });
        await newOtp.save();

        // Dispatch Email
        await sendVerificationEmail(email, otpCode);

        res.json({ message: 'Verification OTP sent successfully' });

    } catch (err) {
        console.error('Error sending OTP:', err.message);
        res.status(500).send('Server Error while sending OTP');
    }
});

// @route   POST /api/users
// @desc    Create a new user (requires OTP validation)
// @access  Private (Admin only)
router.post('/', async (req, res) => {
    const { username, password, role, fullName, email, phone, employeeId, otp } = req.body;

    try {
        if (!otp) {
            return res.status(400).json({ message: 'OTP is required to verify the email address' });
        }

        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Verify OTP from database
        const normalizedEmail = email.trim().toLowerCase();
        const validOtpEntry = await Otp.findOne({ email: normalizedEmail, otp });

        if (!validOtpEntry) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        user = new User({
            username,
            password,
            role,
            fullName,
            email,
            phone,
            employeeId,
            status: req.body.status || 'active', // Admin created users default to active unless specified
            isVerified: true // Set the email as verified automatically since the admin completed the OTP step
        });

        await user.save();

        // Clean up OTP once consumed
        await Otp.deleteOne({ _id: validOtpEntry._id });

        // Return user without password
        const userObj = user.toObject();
        delete userObj.password;

        res.json(userObj);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Admin only)
router.put('/:id', async (req, res) => {
    const { username, role, password } = req.body;

    try {
        let user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Track status changes to dispatch email
        let statusChanged = false;
        let newStatus = req.body.status;

        // Update fields
        if (username) user.username = username;
        if (role) user.role = role;
        if (req.body.status && req.body.status !== user.status) {
            statusChanged = true;
            user.status = req.body.status;
        }
        if (req.body.fullName) user.fullName = req.body.fullName;
        if (req.body.email) user.email = req.body.email;
        if (req.body.phone) user.phone = req.body.phone;
        if (req.body.employeeId !== undefined) user.employeeId = req.body.employeeId;

        if (password && password.trim() !== "") {
            user.password = password; // Will be hashed by pre-save hook
        }

        await user.save();

        if (statusChanged && user.email) {
            try {
                // Determine the correct full name to use (prefer updated, fallback to existing)
                const emailName = req.body.fullName || user.fullName;
                await sendStatusChangeEmail(user.email, emailName, user.status);
            } catch (emailError) {
                console.error("Failed to send status update email:", emailError);
                // We don't fail the request if the email fails, just log it.
            }
        }

        const userObj = user.toObject();
        delete userObj.password;

        res.json(userObj);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (Admin only)
router.delete('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent deleting yourself (optional but good practice)
        if (req.user.id === req.params.id) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

export default router;
