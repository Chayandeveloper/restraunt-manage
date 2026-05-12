const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Restaurant Model
const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  address: String,
  phone: String,
  email: String,
}, { timestamps: true });

// User Model
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['super_admin', 'admin', 'staff', 'kitchen'], required: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
userSchema.index({ restaurantId: 1, role: 1 });
userSchema.index({ email: 1 });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function(password) {
  return bcrypt.compare(password, this.password);
};

// Table Model
const tableSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  tableNumber: { type: String, required: true },
  capacity: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['available', 'occupied', 'reserved'], default: 'available' },
}, { timestamps: true });
tableSchema.index({ restaurantId: 1, status: 1 });
tableSchema.index({ restaurantId: 1, tableNumber: 1 });

// Category Model
const categorySchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  name: { type: String, required: true, trim: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
categorySchema.index({ restaurantId: 1, isActive: 1 });

// MenuItem Model
const menuItemSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  description: String,
  isAvailable: { type: Boolean, default: true },
}, { timestamps: true });
menuItemSchema.index({ restaurantId: 1, categoryId: 1 });
menuItemSchema.index({ restaurantId: 1, isAvailable: 1 });
menuItemSchema.index({ restaurantId: 1, name: 1 });

// Order Model
const orderItemSchema = new mongoose.Schema({
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
});

const orderSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', default: null },
  tableNumber: String,
  source: { type: String, enum: ['direct', 'zomato', 'swiggy'], default: 'direct' },
  items: [orderItemSchema],
  totalAmount: { type: Number, required: true },
  commissionPercent: { type: Number, default: 0, min: 0, max: 100 },
  profit: { type: Number, default: 0 },
  paymentMethod: { type: String, enum: ['cash', 'upi', 'card'], default: 'cash' },
  paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String,
}, { timestamps: true });
orderSchema.index({ restaurantId: 1, createdAt: -1 });
orderSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
orderSchema.index({ restaurantId: 1, paymentStatus: 1, createdAt: -1 });
orderSchema.index({ restaurantId: 1, tableId: 1, status: 1 });
orderSchema.index({ restaurantId: 1, source: 1 });

orderSchema.pre('save', function(next) {
  const commission = (this.totalAmount * this.commissionPercent) / 100;
  this.profit = this.totalAmount - commission;
  next();
});

// Reservation Model
const reservationSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
  customerName: { type: String, required: true, trim: true },
  customerPhone: String,
  partySize: Number,
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'completed', 'no-show', 'cancelled'], default: 'pending' },
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
reservationSchema.index({ restaurantId: 1, startTime: 1 });
reservationSchema.index({ restaurantId: 1, status: 1 });
reservationSchema.index({ tableId: 1, startTime: 1, endTime: 1 });

module.exports = {
  Restaurant: mongoose.model('Restaurant', restaurantSchema),
  User: mongoose.model('User', userSchema),
  Table: mongoose.model('Table', tableSchema),
  Category: mongoose.model('Category', categorySchema),
  MenuItem: mongoose.model('MenuItem', menuItemSchema),
  Order: mongoose.model('Order', orderSchema),
  Reservation: mongoose.model('Reservation', reservationSchema),
};
