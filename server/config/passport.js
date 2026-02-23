import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: (process.env.API_URL || 'http://localhost:5001') + "/api/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // 1. Check if user already exists with this googleId
                let user = await User.findOne({ googleId: profile.id });

                if (user) {
                    return done(null, user);
                }

                // 2. Check if user exists with same email (Hybrid Auth)
                if (profile.emails && profile.emails.length > 0) {
                    user = await User.findOne({ email: profile.emails[0].value });

                    if (user) {
                        // Link googleId to existing user account
                        user.googleId = profile.id;
                        if (!user.isVerified) user.isVerified = true;
                        await user.save();
                        return done(null, user);
                    }
                }

                // 3. Create new user if not exists
                const newUser = new User({
                    googleId: profile.id,
                    email: (profile.emails && profile.emails[0]?.value) || `${profile.id}@google.placeholder.com`, // Fallback
                    fullName: profile.displayName,
                    password: '', // Password not required for social login
                    isVerified: true, // Auto-verify email
                    phone: '0000000000', // Placeholder or handle later
                    role: 'engineer', // Default role
                    status: 'pending' // Social logins default to pending
                });

                await newUser.save();
                done(null, newUser);
            } catch (error) {
                console.error("Google Auth Error:", error);
                done(error, null);
            }
        }
    )
);

passport.use(
    new GitHubStrategy(
        {
            clientID: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            callbackURL: (process.env.API_URL || 'http://localhost:5001') + "/api/auth/github/callback",
            scope: ['user:email'],
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // 1. Check if user already exists with githubId
                let user = await User.findOne({ githubId: profile.id });

                if (user) {
                    return done(null, user);
                }

                // 2. Get email from GitHub
                let email = profile.emails && profile.emails[0]?.value;

                // If email is private/missing in public profile, we might need to fetch it separately or fail
                if (!email) {
                    // Try to generate a dummy one or fail? 
                    // Better to fail or ask user to add email.
                    // For now, let's log warning
                    console.warn("No email found for GitHub user", profile.username);
                }

                if (email) {
                    // 3. Check if user exists with same email (Hybrid Auth)
                    user = await User.findOne({ email: email });

                    if (user) {
                        // Link githubId to existing user
                        user.githubId = profile.id;
                        if (!user.isVerified) user.isVerified = true; // Verify if not already
                        await user.save();
                        return done(null, user);
                    }
                }

                // 4. Create new user
                const newUser = new User({
                    githubId: profile.id,
                    email: email || `${profile.username}@github.placeholder.com`, // Fallback
                    fullName: profile.displayName || profile.username,
                    password: '',
                    isVerified: true,
                    phone: '0000000000',
                    role: 'engineer',
                    status: 'pending'
                });

                await newUser.save();
                done(null, newUser);
            } catch (error) {
                console.error("GitHub Auth Error:", error);
                done(error, null);
            }
        }
    )
);

// Serialize/Deserialize
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});
