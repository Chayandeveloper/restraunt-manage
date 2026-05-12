const jwt = require('jsonwebtoken');
const { User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'restaurant-os-secret-key-2024';

// Auth middleware - verify JWT
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password').lean();
    if (!user || !user.isActive) return res.status(401).json({ message: 'Invalid token' });

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Role middleware
const roleMiddleware = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

// Tenant middleware - adds restaurantId filter
const tenantMiddleware = (req, res, next) => {
  if (req.user.role === 'super_admin') {
    // super_admin can pass restaurantId as query param or body
    req.restaurantId = req.query.restaurantId || req.body.restaurantId || null;
  } else {
    req.restaurantId = req.user.restaurantId;
    if (!req.restaurantId) {
      return res.status(403).json({ message: 'No restaurant assigned' });
    }
  }
  next();
};

module.exports = { authMiddleware, roleMiddleware, tenantMiddleware, JWT_SECRET };
