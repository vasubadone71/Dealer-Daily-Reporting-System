const logRepository = require('../repositories/logRepository');

const requireAdmin = async (req, res, next) => {
    if (req.user && req.user.type === 'admin') {
        return next();
    }

    // Unauthorized attempt by dealer/guest to hit an admin API
    const username = req.user ? (req.user.username || req.user.dealer_code || 'unknown') : 'unauthenticated';
    const actorId = req.user ? req.user.id : null;
    const actorType = req.user ? req.user.type : 'dealer';

    try {
        await logRepository.logActivity({
            actorType: actorType,
            actorId: actorId,
            username: username,
            action: 'Unauthorized Admin API Attempt',
            details: `Attempted to access: ${req.method} ${req.originalUrl}`,
            ipAddress: req.ip || req.headers['x-forwarded-for']
        });
    } catch (err) {
        console.error('Failed to log unauthorized access activity:', err);
    }

    return res.status(403).json({ 
        success: false, 
        message: 'Forbidden. You do not have permission to access this resource.' 
    });
};

const requireSuperAdmin = async (req, res, next) => {
    if (req.user && req.user.type === 'admin' && req.user.role === 'super_admin') {
        return next();
    }

    const username = req.user ? (req.user.username || 'unknown') : 'unauthenticated';
    const actorId = req.user ? req.user.id : null;

    try {
        await logRepository.logActivity({
            actorType: 'admin',
            actorId: actorId,
            username: username,
            action: 'Unauthorized Super Admin API Attempt',
            details: `Attempted to access: ${req.method} ${req.originalUrl}`,
            ipAddress: req.ip || req.headers['x-forwarded-for']
        });
    } catch (err) {
        console.error('Failed to log unauthorized super admin access activity:', err);
    }

    return res.status(403).json({ 
        success: false, 
        message: 'Forbidden. Super Admin privileges required.' 
    });
};

const requireDealer = async (req, res, next) => {
    if (req.user && req.user.type === 'dealer') {
        return next();
    }
    return res.status(403).json({ 
        success: false, 
        message: 'Forbidden. Dealer privileges required.' 
    });
};

module.exports = {
    requireAdmin,
    requireSuperAdmin,
    requireDealer
};
