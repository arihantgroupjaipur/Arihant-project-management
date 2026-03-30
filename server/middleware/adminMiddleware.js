// Middleware to check if user has admin role
// Must be used AFTER authMiddleware to ensure req.user exists

const adminMiddleware = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            message: 'Authentication required'
        });
    }

    if (req.user.role !== 'admin' && req.user.role !== 'super-admin') {
        return res.status(403).json({
            message: 'Access denied. Admin privileges required.'
        });
    }

    next();
};

export default adminMiddleware;
