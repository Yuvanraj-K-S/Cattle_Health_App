const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load test environment variables
dotenv.config({ path: '../config/test.env' });

// Connect to the test database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    });
    console.log('Test MongoDB connected...');
  } catch (err) {
    console.error('Test database connection error:', err);
    process.exit(1);
  }
};

// Clear all test data from the database
const clearDatabase = async () => {
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  } catch (error) {
    console.error('Error clearing test database:', error);
    throw error;
  }
};

// Close the database connection
const closeDatabase = async () => {
  try {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error closing test database:', error);
    throw error;
  }
};

module.exports = {
  connectDB,
  clearDatabase,
  closeDatabase,
};
