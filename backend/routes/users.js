const router = require('express').Router();
const { User } = require('../models');
const { authMiddleware, roleMiddleware, tenantMiddleware } = require('../middleware');

// Get users for a restaurant
router.get('/', authMiddleware, roleMiddleware('super_admin', 'admin'), tenantMiddleware, async (req, res) => {
  try {
    const filter = req.restaurantId ? { restaurantId: req.restaurantId } : {};
    const users = await User.find(filter).select('-password').sort('-createdAt').lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create user
router.post('/', authMiddleware, roleMiddleware('super_admin', 'admin'), tenantMiddleware, async (req, res) => {
  try {
    const { name, email, password, role, restaurantId } = req.body;
    // Admin can only create staff/kitchen for their own restaurant
    if (req.user.role === 'admin') {
      if (!['staff', 'kitchen'].includes(role)) {
        return res.status(403).json({ message: 'Admin can only create staff or kitchen users' });
      }
      req.body.restaurantId = req.restaurantId;
    }
    const user = new User(req.body);
    await user.save();
    const result = user.toObject();
    delete result.password;
    res.status(201).json(result);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Email already exists' });
    res.status(400).json({ message: err.message });
  }
});

// Update user
router.put('/:id', authMiddleware, roleMiddleware('super_admin', 'admin'), async (req, res) => {
  try {
    const { password, ...data } = req.body;
    
    // Authorization check
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    if (req.user.role === 'admin') {
      // Admin can only update users in their own restaurant
      if (targetUser.restaurantId?.toString() !== req.user.restaurantId?.toString()) {
        return res.status(403).json({ message: 'Access denied: Cannot update user from another restaurant' });
      }
      // Admin cannot update super admins
      if (targetUser.role === 'super_admin') {
        return res.status(403).json({ message: 'Access denied: Cannot update super admin' });
      }
    }

    if (password) {
      const bcrypt = require('bcryptjs');
      data.password = await bcrypt.hash(password, 10);
    }
    
    const user = await User.findByIdAndUpdate(req.params.id, data, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete user
router.delete('/:id', authMiddleware, roleMiddleware('super_admin', 'admin'), async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'User deactivated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
