const jwt = require('jsonwebtoken');

function getBearerToken(req) {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return null;
    }

    return token;
}

function requireJwtSecret(res) {
    if (!process.env.JWT_SECRET) {
        res.status(500).json({
            success: false,
            error: 'JWT secret is not configured'
        });
        return false;
    }

    return true;
}

function authMiddleware(req, res, next) {
    if (!requireJwtSecret(res)) {
        return;
    }

    const token = getBearerToken(req);

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Missing or invalid authorization header'
        });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = payload;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }
}

function adminMiddleware(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized'
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'You do not have permission to access this page.'
        });
    }

    next();
}

module.exports = {
    authMiddleware,
    adminMiddleware
};
