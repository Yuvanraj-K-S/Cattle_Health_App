const mongoose = require('mongoose');
const Cattle = require('../models/Cattle');

// Connect to MongoDB
const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cattle_health';

async function connectDB() {
  try {
    await mongoose.connect(mongoURI, {
      // Remove deprecated options for newer MongoDB driver
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      socketTimeoutMS: 45000, // 45 second timeout
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

async function createIndexes() {
  try {
    // Connect to MongoDB
    await connectDB();
    
    console.log('Creating indexes...');
    
    // Create compound index for farm and isDeleted
    console.log('Creating farm_deleted_index...');
    await Cattle.collection.createIndex(
      { farm: 1, isDeleted: 1 },
      { 
        name: 'farm_deleted_index',
        background: true // Build index in background
      }
    );

    // Create compound index for farm and tagId (case-insensitive)
    console.log('Creating farm_tagId_index...');
    await Cattle.collection.createIndex(
      { farm: 1, tagId: 1 },
      { 
        name: 'farm_tagId_index',
        collation: { locale: 'en', strength: 2 } // Case-insensitive comparison
        // Note: We'll handle the uniqueness constraint in the application logic
        // to properly handle soft-deleted records
      }
    );
    
    // Create a sparse index for isDeleted to optimize soft-delete queries
    console.log('Creating isDeleted_index...');
    await Cattle.collection.createIndex(
      { isDeleted: 1 },
      { 
        name: 'isDeleted_index',
        sparse: true
      }
    );
    
    console.log('✅ Indexes created successfully!');
    
    // List all indexes to verify
    const indexes = await Cattle.collection.indexes();
    console.log('\nCurrent indexes:');
    console.log(indexes.map(idx => ({
      name: idx.name,
      key: idx.key,
      unique: idx.unique || false,
      partialFilterExpression: idx.partialFilterExpression || 'none'
    })));
    
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating indexes:', error.message);
    if (error.code === 85) {
      console.error('Error: Index with different options already exists. You may need to drop existing indexes first.');
    }
    process.exit(1);
  }
}

// Run the function if this file is executed directly
if (require.main === module) {
  createIndexes();
}
