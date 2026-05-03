const router = require('express').Router();
const { Restaurant, User } = require('../models');
const { authMiddleware, roleMiddleware } = require('../middleware');

// Get all restaurants (super_admin only)
router.get('/', authMiddleware, roleMiddleware('super_admin'), async (req, res) => {
  try {
    const restaurants = await Restaurant.find().sort('-createdAt');
    res.json(restaurants);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create restaurant (super_admin only)
router.post('/', authMiddleware, roleMiddleware('super_admin'), async (req, res) => {
  try {
    const restaurant = new Restaurant(req.body);
    await restaurant.save();
    res.status(201).json(restaurant);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update restaurant
router.put('/:id', authMiddleware, roleMiddleware('super_admin'), async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
    res.json(restaurant);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete restaurant
router.delete('/:id', authMiddleware, roleMiddleware('super_admin'), async (req, res) => {
  try {
    await Restaurant.findByIdAndDelete(req.params.id);
    res.json({ message: 'Restaurant deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
