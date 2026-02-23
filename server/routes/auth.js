import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import passport from 'passport';

const router = express.Router();

import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/emailService.js';

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', async (req, res) => {
    const { password, role, fullName, email, phone, employeeId } = req.body;

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log('Generated OTP for registration:', otp); // Log OTP for testing
        const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

        user = new User({
            password,
            role,
            fullName,
            email,
            phone,
            employeeId,
            otp,
            otpExpires,
            isVerified: false
        });

        await user.save();
        try {
            await sendVerificationEmail(email, otp);
            res.json({ message: 'Registration successful. Please check your email for verification OTP.' });
        } catch (emailError) {
            console.error('Error sending email:', emailError);
            await User.deleteOne({ _id: user._id }); // Rollback user creation
            return res.status(500).json({ message: 'Error sending verification email. Please try again.' });
        }

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST /api/auth/verify-email
// @desc    Verify email with OTP
// @access  Public
router.post('/verify-email', async (req, res) => {
    const { email, otp } = req.body;

    try {
        const user = await User.findOne({ email }).select('+otp +otpExpires');

        if (!user) {
            return res.status(400).json({ message: 'Invalid email' });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: 'Email already verified' });
        }

        if (user.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (user.otpExpires < Date.now()) {
            return res.status(400).json({ message: 'OTP expired' });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        // Generate Token
        const payload = {
            id: user._id,
            role: user.role,
            fullName: user.fullName,
            email: user.email
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'secret_key_123',
            { expiresIn: '1d' },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: payload, message: 'Email verified successfully' });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        if (!user.isVerified) {
            return res.status(403).json({ message: 'Email not verified. Please verify your email first.' });
        }

        if (user.status && user.status !== 'active') {
            if (user.status === 'pending') {
                return res.status(403).json({
                    message: 'Account is pending verification. Please contact admin.',
                    error: 'ACCOUNT_PENDING'
                });
            }
            return res.status(403).json({ message: `Account is ${user.status}. Please contact admin.` });
        }

        const payload = {
            id: user._id,
            role: user.role,
            fullName: user.fullName,
            email: user.email
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'secret_key_123',
            { expiresIn: '1d' },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: payload });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset OTP
// @access  Public
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log('Generated OTP for password reset:', otp); // Log OTP for testing
        user.otp = otp;
        user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save();

        await sendPasswordResetEmail(email, otp);

        res.json({ message: 'Password reset OTP sent to email' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with OTP
// @access  Public
router.post('/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;

    try {
        const user = await User.findOne({ email }).select('+otp +otpExpires');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (user.otpExpires < Date.now()) {
            return res.status(400).json({ message: 'OTP expired' });
        }

        user.password = newPassword; // Will be hashed by pre-save hook
        user.otp = undefined;
        user.otpExpires = undefined;
        user.isVerified = true; // Auto-verify email on password reset
        await user.save();

        res.json({ message: 'Password reset successful. You can now login.' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});


// @route   GET /api/auth/google
// @desc    Auth with Google
// @access  Public
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// @route   GET /api/auth/google/callback
// @desc    Google auth callback
// @access  Public
router.get('/google/callback',
    (req, res, next) => {
        passport.authenticate('google', {
            failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=auth_failed`,
            session: false
        })(req, res, next);
    },
    (req, res) => {
        if (req.user.status && req.user.status !== 'active') {
            if (req.user.status === 'pending') {
                return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/pending-approval`);
            }
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=account_${req.user.status}`);
        }

        const payload = {
            id: req.user.id,
            role: req.user.role,
            fullName: req.user.fullName,
            email: req.user.email
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'secret_key_123',
            { expiresIn: '1d' },
            (err, token) => {
                if (err) throw err;
                res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth-callback?token=${token}`);
            }
        );
    }
);

// @route   GET /api/auth/github
// @desc    Auth with GitHub
// @access  Public
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

// @route   GET /api/auth/github/callback
// @desc    GitHub auth callback
// @access  Public
router.get('/github/callback',
    (req, res, next) => {
        passport.authenticate('github', { session: false }, (err, user, info) => {
            if (err) {
                console.error("Passport GitHub Error:", err);
                return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=auth_failed_err`);
            }
            if (!user) {
                console.error("Passport GitHub User Missing:", info);
                return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=auth_failed_no_user`);
            }
            req.user = user;
            next();
        })(req, res, next);
    },
    (req, res) => {
        if (req.user.status && req.user.status !== 'active') {
            if (req.user.status === 'pending') {
                return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/pending-approval`);
            }
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=account_${req.user.status}`);
        }

        const payload = {
            id: req.user.id,
            role: req.user.role,
            fullName: req.user.fullName,
            email: req.user.email
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'secret_key_123',
            { expiresIn: '1d' },
            (err, token) => {
                if (err) throw err;
                res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth-callback?token=${token}`);
            }
        );
    }
);

export default router;
