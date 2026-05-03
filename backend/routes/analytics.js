const router = require('express').Router();
const { Order } = require('../models');
const { authMiddleware, roleMiddleware, tenantMiddleware } = require('../middleware');

router.get('/', authMiddleware, roleMiddleware('super_admin', 'admin'), tenantMiddleware, async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const baseFilter = { restaurantId, createdAt: { $gte: start, $lte: end } };

    // Revenue by source
    const revenueBySource = await Order.aggregate([
      { $match: baseFilter },
      { 
        $group: { 
          _id: '$source', 
          revenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] } }, 
          profit: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$profit', 0] } }, 
          count: { $sum: 1 } 
        } 
      }
    ]);

    // Orders per day
    const ordersPerDay = await Order.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          revenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] } },
          profit: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$profit', 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Peak hours
    const peakHours = await Order.aggregate([
      { $match: baseFilter },
      { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Table usage
    const tableUsage = await Order.aggregate([
      { $match: { ...baseFilter, tableId: { $ne: null }, paymentStatus: 'paid' } },
      { $group: { _id: '$tableNumber', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { count: -1 } }
    ]);

    // Summary stats
    const summary = await Order.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] } },
          totalProfit: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$profit', 0] } },
          totalOrders: { $sum: 1 },
          completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        }
      }
    ]);

    res.json({
      summary: summary[0] || { totalRevenue: 0, totalProfit: 0, totalOrders: 0 },
      revenueBySource,
      ordersPerDay,
      peakHours,
      tableUsage,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
