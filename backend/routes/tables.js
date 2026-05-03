const router = require('express').Router();
const { Table } = require('../models');
const { authMiddleware, roleMiddleware, tenantMiddleware } = require('../middleware');

router.get('/', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const filter = { restaurantId: req.restaurantId };
    const tables = await Table.find(filter).sort('tableNumber');
    res.json(tables);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', authMiddleware, roleMiddleware('super_admin', 'admin'), tenantMiddleware, async (req, res) => {
  try {
    const table = new Table({ ...req.body, restaurantId: req.restaurantId });
    await table.save();
    res.status(201).json(table);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', authMiddleware, roleMiddleware('super_admin', 'admin', 'staff'), tenantMiddleware, async (req, res) => {
  try {
    const table = await Table.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.restaurantId },
      req.body,
      { new: true }
    );
    if (!table) return res.status(404).json({ message: 'Table not found' });
    res.json(table);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', authMiddleware, roleMiddleware('super_admin', 'admin'), tenantMiddleware, async (req, res) => {
  try {
    await Table.findOneAndDelete({ _id: req.params.id, restaurantId: req.restaurantId });
    res.json({ message: 'Table deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
