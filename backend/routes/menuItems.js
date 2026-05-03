const router = require('express').Router();
const { MenuItem } = require('../models');
const { authMiddleware, roleMiddleware, tenantMiddleware } = require('../middleware');

router.get('/', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const filter = { restaurantId: req.restaurantId };
    if (req.query.categoryId) filter.categoryId = req.query.categoryId;
    if (req.query.available === 'true') filter.isAvailable = true;
    const items = await MenuItem.find(filter).populate('categoryId', 'name').sort('name');
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', authMiddleware, roleMiddleware('super_admin', 'admin'), tenantMiddleware, async (req, res) => {
  try {
    const item = new MenuItem({ ...req.body, restaurantId: req.restaurantId });
    await item.save();
    await item.populate('categoryId', 'name');
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', authMiddleware, roleMiddleware('super_admin', 'admin'), tenantMiddleware, async (req, res) => {
  try {
    const item = await MenuItem.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.restaurantId },
      req.body, { new: true }
    ).populate('categoryId', 'name');
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', authMiddleware, roleMiddleware('super_admin', 'admin'), tenantMiddleware, async (req, res) => {
  try {
    await MenuItem.findOneAndDelete({ _id: req.params.id, restaurantId: req.restaurantId });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
