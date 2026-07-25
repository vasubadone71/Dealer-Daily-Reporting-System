const jwt = require('jsonwebtoken');

const requireAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, message: 'Access denied. Token malformed.' });
    }

    try {
        const secret = process.env.JWT_SECRET || 'shiva_honda_super_secret_jwt_key_2026';
        const decoded = jwt.verify(token, secret);
        req.user = decoded; // { id, username, role, type: 'admin' | 'dealer' }
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
};

const requireSuperAdmin = (req, res, next) => {
    requireAuth(req, res, () => {
        if (req.user && req.user.role === 'super_admin') {
            next();
        } else {
            return res.status(403).json({ success: false, message: 'Access denied. Super admin only.' });
        }
    });
};

module.exports = {
    requireAuth,
    requireSuperAdmin,
    verifyToken: requireAuth // alias for backwards compatibility
};
