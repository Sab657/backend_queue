// seedAdmin.js
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

const seedAdmins = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Check if admins already exist
    const existingAdmins = await Admin.countDocuments();
    if (existingAdmins > 0) {
      console.log('ℹ️ Admins already exist. Skipping seed.');
      process.exit(0);
    }

    // Default admin(s)
    const defaultAdmins = [
      {
        username: 'admin',
        password: '@dmin_12345678', // <-- pre('save') will hash this
        role: 'admin',
      },
    ];

    // Insert admins (this will trigger pre('save') hook → hashes password)
    const createdAdmins = await Admin.create(defaultAdmins);

    console.log('✅ Default admins created successfully:');
    createdAdmins.forEach((admin) => {
      console.log(`   - ${admin.username} - Role: ${admin.role}`);
    });

    console.log('\n📋 Default Login Credentials:');
    console.log('  admin / admin123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admins:', error);
    process.exit(1);
  }
};

// Run the seed function
seedAdmins();
