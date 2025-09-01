const mongoose = require('mongoose');
const Cattle = require('../models/Cattle');

async function dropTagIdIndex() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/cattleMonitor', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Drop the single field index on tag_id
    await Cattle.collection.dropIndex('tag_id_1');
    console.log('✅ Successfully removed tag_id_1 index');
    
    // Verify the indexes
    const indexes = await Cattle.collection.indexes();
    console.log('Current indexes:', indexes.map(idx => idx.name || JSON.stringify(idx.key)));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

dropTagIdIndex();
