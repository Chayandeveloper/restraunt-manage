require('dotenv').config();
const mongoose = require('mongoose');
const { Restaurant, User, Table, Category, MenuItem, Order } = require('./models');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/restaurant-os';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await Promise.all([
    Restaurant.deleteMany({}),
    User.deleteMany({}),
    Table.deleteMany({}),
    Category.deleteMany({}),
    MenuItem.deleteMany({}),
    Order.deleteMany({}),
  ]);

  // Create super admin
  const superAdmin = await User.create({
    name: 'Super Admin',
    email: 'admin@gmail.com',
    password: 'Spiderwoman55@',
    role: 'super_admin',
    restaurantId: null,
  });
  console.log('Super admin created: admin@gmail.com / Spiderwoman55@');

  // Create restaurants
  const rest1 = await Restaurant.create({ name: 'Spice Garden', address: '123 Main St', phone: '9876543210', email: 'spice@example.com' });
  const rest2 = await Restaurant.create({ name: 'The Curry House', address: '456 Park Ave', phone: '9876543211', email: 'curry@example.com' });

  // Create admin users
  const admin1 = await User.create({
    name: 'Ravi Kumar',
    email: 'ravi@spicegarden.com',
    password: 'admin123',
    role: 'admin',
    restaurantId: rest1._id,
  });

  const admin2 = await User.create({
    name: 'Priya Sharma',
    email: 'priya@curryhouse.com',
    password: 'admin123',
    role: 'admin',
    restaurantId: rest2._id,
  });

  // Create staff for rest1
  await User.create({
    name: 'Arjun Staff',
    email: 'arjun@spicegarden.com',
    password: 'staff123',
    role: 'staff',
    restaurantId: rest1._id,
  });

  await User.create({
    name: 'Kitchen Team',
    email: 'kitchen@spicegarden.com',
    password: 'kitchen123',
    role: 'kitchen',
    restaurantId: rest1._id,
  });

  // Create tables for rest1
  const tables = await Table.insertMany([
    { restaurantId: rest1._id, tableNumber: 'T1', capacity: 2 },
    { restaurantId: rest1._id, tableNumber: 'T2', capacity: 4 },
    { restaurantId: rest1._id, tableNumber: 'T3', capacity: 4 },
    { restaurantId: rest1._id, tableNumber: 'T4', capacity: 6 },
    { restaurantId: rest1._id, tableNumber: 'T5', capacity: 8 },
    { restaurantId: rest2._id, tableNumber: 'A1', capacity: 2 },
    { restaurantId: rest2._id, tableNumber: 'A2', capacity: 4 },
    { restaurantId: rest2._id, tableNumber: 'A3', capacity: 6 },
  ]);

  // Create categories & menu for rest1
  const cats = await Category.insertMany([
    { restaurantId: rest1._id, name: 'Starters' },
    { restaurantId: rest1._id, name: 'Main Course' },
    { restaurantId: rest1._id, name: 'Breads' },
    { restaurantId: rest1._id, name: 'Desserts' },
    { restaurantId: rest1._id, name: 'Beverages' },
  ]);

  await MenuItem.insertMany([
    { restaurantId: rest1._id, categoryId: cats[0]._id, name: 'Paneer Tikka', price: 220, description: 'Grilled cottage cheese' },
    { restaurantId: rest1._id, categoryId: cats[0]._id, name: 'Samosa (2 pcs)', price: 60, description: 'Crispy fried pastry' },
    { restaurantId: rest1._id, categoryId: cats[0]._id, name: 'Chicken 65', price: 280, description: 'Spicy fried chicken' },
    { restaurantId: rest1._id, categoryId: cats[1]._id, name: 'Butter Chicken', price: 320, description: 'Creamy tomato gravy' },
    { restaurantId: rest1._id, categoryId: cats[1]._id, name: 'Dal Makhani', price: 200, description: 'Slow cooked black lentils' },
    { restaurantId: rest1._id, categoryId: cats[1]._id, name: 'Mutton Rogan Josh', price: 420, description: 'Kashmiri lamb curry' },
    { restaurantId: rest1._id, categoryId: cats[1]._id, name: 'Palak Paneer', price: 240, description: 'Spinach & cottage cheese' },
    { restaurantId: rest1._id, categoryId: cats[2]._id, name: 'Garlic Naan', price: 50 },
    { restaurantId: rest1._id, categoryId: cats[2]._id, name: 'Tandoori Roti', price: 30 },
    { restaurantId: rest1._id, categoryId: cats[2]._id, name: 'Butter Naan', price: 45 },
    { restaurantId: rest1._id, categoryId: cats[3]._id, name: 'Gulab Jamun', price: 80 },
    { restaurantId: rest1._id, categoryId: cats[3]._id, name: 'Kulfi', price: 90 },
    { restaurantId: rest1._id, categoryId: cats[4]._id, name: 'Mango Lassi', price: 100 },
    { restaurantId: rest1._id, categoryId: cats[4]._id, name: 'Masala Chai', price: 40 },
    { restaurantId: rest1._id, categoryId: cats[4]._id, name: 'Cold Coffee', price: 120 },
  ]);

  // Create sample orders for analytics
  const now = new Date();
  const sampleOrders = [];
  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    date.setHours(Math.floor(Math.random() * 14) + 9);
    const sources = ['direct', 'zomato', 'swiggy'];
    const source = sources[Math.floor(Math.random() * sources.length)];
    const total = Math.floor(Math.random() * 800) + 200;
    const commission = source === 'direct' ? 0 : source === 'zomato' ? 20 : 18;
    const table = tables[Math.floor(Math.random() * 5)];
    sampleOrders.push({
      restaurantId: rest1._id,
      tableId: source === 'direct' ? table._id : null,
      tableNumber: source === 'direct' ? table.tableNumber : null,
      source,
      items: [{ name: 'Sample Item', price: total, quantity: 1 }],
      totalAmount: total,
      commissionPercent: commission,
      profit: total - (total * commission / 100),
      paymentMethod: ['cash', 'upi', 'card'][Math.floor(Math.random() * 3)],
      paymentStatus: 'paid',
      status: 'completed',
      createdBy: admin1._id,
      createdAt: date,
    });
  }
  await Order.insertMany(sampleOrders);

  console.log('\n=== SEED COMPLETE ===');
  console.log('Super Admin: admin@gmail.com / Spiderwoman55@');
  console.log('Admin (Spice Garden): ravi@spicegarden.com / admin123');
  console.log('Staff (Spice Garden): arjun@spicegarden.com / staff123');
  console.log('Kitchen (Spice Garden): kitchen@spicegarden.com / kitchen123');
  console.log('Admin (Curry House): priya@curryhouse.com / admin123');
  
  await mongoose.disconnect();
}

seed().catch(console.error);
