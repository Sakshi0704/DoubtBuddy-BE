const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // Get token from Authorization header
    const authHeader = req.header('Authorization');

    // Check if no auth header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        // Extract token (remove "Bearer " prefix)
        const token = authHeader.split(' ')[1];
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Add user from payload
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};
