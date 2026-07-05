const mongoose = require('mongoose');

const connectDB = async (retries = 5) => {
  for (let i = 1; i <= retries; i++) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        family: 4, // force IPv4
      });
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.error(`❌ MongoDB attempt ${i}/${retries} failed: ${error.message}`);
      if (i === retries) {
        console.error('💀 All MongoDB connection attempts failed. Exiting.');
        process.exit(1);
      }
      const delay = i * 3000;
      console.log(`⏳ Retrying in ${delay / 1000}s...`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
};

module.exports = connectDB;
