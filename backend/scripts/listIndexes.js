const mongoose = require('mongoose');
const Cattle = require('../models/Cattle');

async function listIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/cattleMonitor', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // List all indexes
    const indexes = await Cattle.collection.indexes();
    console.log('Current indexes on cattles collection:');
    console.log(JSON.stringify(indexes, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

listIndexes();
