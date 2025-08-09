const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const Cattle = require('../models/Cattle');

// Set up MongoDB connection
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cattleMonitor';


async function checkAndFixIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    console.log('Using MongoDB URI:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');
    
    // Get current indexes
    const indexes = await Cattle.collection.indexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));
    
    // Find and remove all tag ID related indexes
    const tagIndexes = indexes.filter(index => 
      index.key.tagId || index.key.tag_id || 
      (index.name && (index.name.includes('tagId') || index.name.includes('tag_id')))
    );
    
    console.log('Found tag ID related indexes:', tagIndexes.length);
    
    // Drop all tag ID related indexes
    for (const index of tagIndexes) {
      try {
        console.log(`Dropping index: ${index.name} (${JSON.stringify(index.key)})`);
        await Cattle.collection.dropIndex(index.name);
        console.log(`✅ Dropped index: ${index.name}`);
      } catch (err) {
        console.error(`❌ Error dropping index ${index.name}:`, err.message);
      }
    }
    
    // Create a new index with correct options
    console.log('\nCreating new index on tagId...');
    try {
      await Cattle.collection.createIndex(
        { tagId: 1 },
        {
          name: 'tagId_unique',
          unique: true,
          partialFilterExpression: { tagId: { $exists: true } },
          background: true
        }
      );
      console.log('✅ Successfully created new index on tagId');
    } catch (err) {
      console.error('❌ Error creating index:', err.message);
      throw err;
    }
    
    // Verify the new index
    const newIndexes = await Cattle.collection.indexes();
    console.log('\nUpdated indexes:', JSON.stringify(newIndexes, null, 2));
    
    // Test with a sample document
    console.log('\nTesting with a sample document...');
    const testTagId = 'TEST' + Date.now();
    
    try {
      // First insert should work
      const testDoc1 = await Cattle.create({
        tagId: testTagId,
        species: 'cow',
        farm: new mongoose.Types.ObjectId(), // Dummy farm ID for testing
        addedBy: new mongoose.Types.ObjectId(), // Dummy user ID for testing
      });
      console.log('✅ Successfully inserted test document 1');
      
      // Second insert with same tagId should fail
      try {
        await Cattle.create({
          tagId: testTagId, // Same tagId
          species: 'cow',
          farm: new mongoose.Types.ObjectId(),
          addedBy: new mongoose.Types.ObjectId(),
        });
        console.error('❌ Error: Duplicate tagId was allowed!');
      } catch (err) {
        if (err.code === 11000) {
          console.log('✅ Correctly prevented duplicate tagId');
        } else {
          console.error('Unexpected error:', err);
        }
      }
      
      // Clean up
      await Cattle.deleteOne({ _id: testDoc1._id });
      console.log('✅ Cleaned up test documents');
      
    } catch (err) {
      console.error('Test failed:', err);
    }
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

checkAndFixIndexes();
