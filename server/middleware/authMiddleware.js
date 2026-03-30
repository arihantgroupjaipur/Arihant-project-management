import jwt from 'jsonwebtoken';
import ActiveSession from '../models/ActiveSession.js';

const authMiddleware = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_123');
        req.user = decoded;

        // Skip session check for the logout route itself
        if (req.originalUrl.includes('/auth/logout')) return next();

        // Check if the session is still active (handles force-logout by super-admin)
        const session = await ActiveSession.findOne({ userId: decoded.id }).lean();
        if (!session) {
            return res.status(401).json({ message: 'Session invalidated. Please log in again.' });
        }

        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

export default authMiddleware;
