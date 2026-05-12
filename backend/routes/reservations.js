const router = require('express').Router();
const { Reservation, Table } = require('../models');
const { authMiddleware, roleMiddleware, tenantMiddleware } = require('../middleware');

router.get('/', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const filter = { restaurantId: req.restaurantId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.date) {
      const date = new Date(req.query.date);
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      filter.startTime = { $gte: date, $lt: next };
    }
    const reservations = await Reservation.find(filter)
      .populate('tableId', 'tableNumber capacity')
      .populate('createdBy', 'name')
      .sort('startTime')
      .lean();
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', authMiddleware, roleMiddleware('super_admin', 'admin', 'staff'), tenantMiddleware, async (req, res) => {
  try {
    const { tableId, startTime, endTime } = req.body;

    // Check for conflicts
    const conflict = await Reservation.findOne({
      restaurantId: req.restaurantId,
      tableId,
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        { startTime: { $lt: new Date(endTime), $gte: new Date(startTime) } },
        { endTime: { $gt: new Date(startTime), $lte: new Date(endTime) } },
        { startTime: { $lte: new Date(startTime) }, endTime: { $gte: new Date(endTime) } },
      ]
    }).lean();

    if (conflict) {
      return res.status(409).json({ message: 'Table is already reserved for this time slot' });
    }

    const reservation = new Reservation({
      ...req.body,
      restaurantId: req.restaurantId,
      createdBy: req.user._id,
    });
    await reservation.save();
    
    // Update table status to reserved
    await Table.findByIdAndUpdate(tableId, { status: 'reserved' });
    
    await reservation.populate('tableId', 'tableNumber capacity');
    res.status(201).json(reservation);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', authMiddleware, roleMiddleware('super_admin', 'admin', 'staff'), tenantMiddleware, async (req, res) => {
  try {
    const reservation = await Reservation.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.restaurantId },
      req.body, { new: true }
    ).populate('tableId', 'tableNumber capacity');
    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
    res.json(reservation);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', authMiddleware, roleMiddleware('super_admin', 'admin', 'staff'), tenantMiddleware, async (req, res) => {
  try {
    const resv = await Reservation.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.restaurantId },
      { status: 'cancelled' }
    );
    if (resv) {
      await Table.findByIdAndUpdate(resv.tableId, { status: 'available' });
    }
    res.json({ message: 'Reservation cancelled' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
