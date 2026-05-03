const router = require('express').Router();
const { Order, Table } = require('../models');
const { authMiddleware, roleMiddleware, tenantMiddleware } = require('../middleware');

// Add items to existing order
router.post('/:id/items', authMiddleware, roleMiddleware('super_admin', 'admin', 'staff'), tenantMiddleware, async (req, res) => {
  try {
    const { items } = req.body;
    const order = await Order.findOne({ _id: req.params.id, restaurantId: req.restaurantId });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    order.items.push(...items);
    order.totalAmount = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
    await order.save();
    await order.populate('tableId', 'tableNumber');
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Remove item from order by index
router.delete('/:id/items/:index', authMiddleware, roleMiddleware('super_admin', 'admin', 'staff'), tenantMiddleware, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, restaurantId: req.restaurantId });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const idx = parseInt(req.params.index);
    if (idx < 0 || idx >= order.items.length) return res.status(400).json({ message: 'Invalid item index' });
    order.items.splice(idx, 1);
    order.totalAmount = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
    await order.save();
    await order.populate('tableId', 'tableNumber');
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get orders
router.get('/', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const filter = { restaurantId: req.restaurantId };
    if (req.query.status) {
      // support comma-separated statuses e.g. status=pending,preparing
      const statuses = req.query.status.split(',');
      filter.status = statuses.length > 1 ? { $in: statuses } : statuses[0];
    }
    if (req.query.source) filter.source = req.query.source;
    if (req.query.tableId) filter.tableId = req.query.tableId;
    if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
    if (req.query.date) {
      const date = new Date(req.query.date);
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      filter.createdAt = { $gte: date, $lt: next };
    }
    if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;
    const orders = await Order.find(filter)
      .populate('tableId', 'tableNumber')
      .populate('createdBy', 'name')
      .sort('-createdAt')
      .limit(parseInt(req.query.limit) || 100);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get active order for a specific table
router.get('/table/:tableId/active', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const order = await Order.findOne({
      restaurantId: req.restaurantId,
      tableId: req.params.tableId,
      status: { $in: ['pending', 'preparing', 'ready'] },
    })
      .populate('tableId', 'tableNumber capacity')
      .populate('createdBy', 'name')
      .sort('-createdAt');
    res.json(order || null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Today's summary
router.get('/summary/today', authMiddleware, roleMiddleware('super_admin', 'admin'), tenantMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    const start = date ? new Date(date) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const filterPaid = { restaurantId: req.restaurantId, createdAt: { $gte: start, $lt: end }, paymentStatus: 'paid' };
    const filterAll = { restaurantId: req.restaurantId, createdAt: { $gte: start, $lt: end } };

    const [summary, bySource, byPayment, byStatus, hourly] = await Promise.all([
      Order.aggregate([
        { $match: filterAll },
        { $group: {
          _id: null,
          totalRevenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] } },
          totalProfit: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$profit', 0] } },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', null] } },
          paidOrders: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] } },
        }},
      ]),
      Order.aggregate([
        { $match: filterAll },
        { $group: { 
          _id: '$source', 
          revenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] } }, 
          profit: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$profit', 0] } }, 
          count: { $sum: 1 } 
        } },
      ]),
      Order.aggregate([
        { $match: filterPaid },
        { $group: { _id: '$paymentMethod', count: { $sum: 1 }, amount: { $sum: '$totalAmount' } } },
      ]),
      Order.aggregate([
        { $match: filterAll },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: filterPaid },
        { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.json({
      summary: summary[0] || { totalRevenue: 0, totalProfit: 0, totalOrders: 0, paidOrders: 0, unpaidOrders: 0, completedOrders: 0, activeOrders: 0, avgOrderValue: 0 },
      bySource,
      byPayment,
      byStatus,
      hourly,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single order
router.get('/:id', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, restaurantId: req.restaurantId })
      .populate('tableId', 'tableNumber')
      .populate('createdBy', 'name');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create order
router.post('/', authMiddleware, roleMiddleware('super_admin', 'admin', 'staff'), tenantMiddleware, async (req, res) => {
  try {
    const { items, tableId, source, commissionPercent, paymentMethod, notes } = req.body;
    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const order = new Order({
      restaurantId: req.restaurantId,
      tableId: tableId || null,
      source: source || 'direct',
      items,
      totalAmount,
      commissionPercent: commissionPercent || 0,
      paymentMethod: paymentMethod || 'cash',
      notes,
      createdBy: req.user._id,
    });
    await order.save();
    if (tableId) await Table.findByIdAndUpdate(tableId, { status: 'occupied' });
    await order.populate('tableId', 'tableNumber');
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Add items to existing order
router.post('/:id/items', authMiddleware, roleMiddleware('super_admin', 'admin', 'staff'), tenantMiddleware, async (req, res) => {
  try {
    const { items } = req.body;
    const order = await Order.findOne({ _id: req.params.id, restaurantId: req.restaurantId });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status === 'completed') return res.status(400).json({ message: 'Cannot modify a completed order' });

    // Merge items: if same menuItemId exists, add quantity; else append
    items.forEach(newItem => {
      const existing = order.items.find(i => i.menuItemId?.toString() === newItem.menuItemId);
      if (existing) {
        existing.quantity += newItem.quantity;
      } else {
        order.items.push(newItem);
      }
    });
    order.totalAmount = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
    await order.save();
    await order.populate('tableId', 'tableNumber');
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Remove item from order
router.delete('/:id/items/:itemIndex', authMiddleware, roleMiddleware('super_admin', 'admin', 'staff'), tenantMiddleware, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, restaurantId: req.restaurantId });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status === 'completed') return res.status(400).json({ message: 'Cannot modify completed order' });
    const idx = parseInt(req.params.itemIndex);
    order.items.splice(idx, 1);
    order.totalAmount = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
    await order.save();
    await order.populate('tableId', 'tableNumber');
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update order status
router.put('/:id/status', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.restaurantId },
      { status }, { new: true }
    ).populate('tableId', 'tableNumber');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (status === 'completed' && order.tableId) {
      // Only free table if no other active orders on it
      const otherActive = await Order.findOne({
        tableId: order.tableId._id,
        status: { $in: ['pending', 'preparing', 'ready'] },
        _id: { $ne: order._id },
      });
      if (!otherActive) await Table.findByIdAndUpdate(order.tableId._id, { status: 'available' });
    }
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update payment
router.put('/:id/payment', authMiddleware, roleMiddleware('super_admin', 'admin', 'staff'), tenantMiddleware, async (req, res) => {
  try {
    const { paymentMethod, paymentStatus } = req.body;
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.restaurantId },
      { paymentMethod, paymentStatus }, { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update full order
router.put('/:id', authMiddleware, roleMiddleware('super_admin', 'admin', 'staff'), tenantMiddleware, async (req, res) => {
  try {
    const { items, ...rest } = req.body;
    if (items) {
      rest.items = items;
      rest.totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.restaurantId },
      rest, { new: true }
    ).populate('tableId', 'tableNumber');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
