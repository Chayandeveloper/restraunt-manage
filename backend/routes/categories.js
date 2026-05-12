const router = require('express').Router();
const { Category } = require('../models');
const { authMiddleware, roleMiddleware, tenantMiddleware } = require('../middleware');

router.get('/', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const categories = await Category.find({ restaurantId: req.restaurantId }).sort('name').lean();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', authMiddleware, roleMiddleware('super_admin', 'admin'), tenantMiddleware, async (req, res) => {
  try {
    const category = new Category({ ...req.body, restaurantId: req.restaurantId });
    await category.save();
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', authMiddleware, roleMiddleware('super_admin', 'admin'), tenantMiddleware, async (req, res) => {
  try {
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.restaurantId },
      req.body, { new: true }
    );
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', authMiddleware, roleMiddleware('super_admin', 'admin'), tenantMiddleware, async (req, res) => {
  try {
    await Category.findOneAndDelete({ _id: req.params.id, restaurantId: req.restaurantId });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
