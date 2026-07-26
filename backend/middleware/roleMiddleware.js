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

const requireSuperAdminOrGodown = async (req, res, next) => {
    // Allows super_admin (admin table) OR godown (dealers table with role = 'godown')
    if (req.user) {
        if (req.user.type === 'admin' && req.user.role === 'super_admin') {
            return next();
        }
        if (req.user.type === 'dealer' && req.user.role === 'godown') {
            return next();
        }
    }
    
    return res.status(403).json({ 
        success: false, 
        message: 'Forbidden. Super Admin or Godown privileges required.' 
    });
};

const requireCanDispatch = async (req, res, next) => {
    // Allows super_admin, godown, and showroom
    if (req.user) {
        if (req.user.type === 'admin' && req.user.role === 'super_admin') {
            return next();
        }
        if (req.user.type === 'dealer' && (req.user.role === 'godown' || req.user.role === 'showroom')) {
            return next();
        }
    }
    
    return res.status(403).json({ 
        success: false, 
        message: 'Forbidden. Dispatch privileges required.' 
    });
};

const requireAdminOrGodown = async (req, res, next) => {
    if (req.user) {
        if (req.user.type === 'admin') {
            return next();
        }
        if (req.user.type === 'dealer' && (req.user.role === 'godown' || req.user.role === 'showroom')) {
            return next();
        }
    }
    return res.status(403).json({ 
        success: false, 
        message: 'Forbidden. Admin, Godown, or Showroom privileges required.' 
    });
};

module.exports = {
    requireAdmin,
    requireSuperAdmin,
    requireDealer,
    requireSuperAdminOrGodown,
    requireAdminOrGodown,
    requireCanDispatch
};
