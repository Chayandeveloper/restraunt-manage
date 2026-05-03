require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./models');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/restaurant-os';

async function updateAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const newEmail = 'admin@gmail.com';
    const newPassword = 'Spiderwoman55@';

    // Find super admin by role or previous email
    let admin = await User.findOne({ 
      $or: [
        { role: 'super_admin' },
        { email: 'admin@restaurantos.com' }
      ]
    });

    if (admin) {
      console.log(`Found existing super admin: ${admin.email}. Updating...`);
      admin.email = newEmail;
      admin.password = newPassword;
      admin.role = 'super_admin'; // Ensure role is correct
      await admin.save();
      console.log(`Super admin updated to: ${newEmail} / ${newPassword}`);
    } else {
      console.log('Super admin not found. Creating new one...');
      admin = await User.create({
        name: 'Super Admin',
        email: newEmail,
        password: newPassword,
        role: 'super_admin',
        restaurantId: null,
      });
      console.log(`Super admin created: ${newEmail} / ${newPassword}`);
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error updating super admin:', error);
    process.exit(1);
  }
}

updateAdmin();
