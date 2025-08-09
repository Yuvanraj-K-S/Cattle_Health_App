const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

// Get MongoDB URI from environment or use default
const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/cattle-health';
console.log('Connecting to MongoDB with URI:', mongoURI.replace(/:([^:]*?)@/, ':***@'));

async function checkConnection() {
  try {
    console.log('Attempting to connect to MongoDB...');
    
    // Set up event listeners for the connection
    mongoose.connection.on('connecting', () => {
      console.log('Mongoose connecting to MongoDB...');
    });
    
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to MongoDB');
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('Mongoose connection error:', err);
    });
    
    // Connect to MongoDB
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      family: 4, // Use IPv4, skip trying IPv6
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Successfully connected to MongoDB');
    console.log('Database name:', mongoose.connection.db.databaseName);
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nCollections in database:');
    console.table(collections.map(c => ({ name: c.name, type: c.type })));
    
    // Get stats for each collection
    for (const coll of collections) {
      try {
        const stats = await mongoose.connection.db.collection(coll.name).stats();
        console.log(`\nStats for collection ${coll.name}:`);
        console.log(`- Document count: ${stats.count}`);
        console.log(`- Size on disk: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`- Storage size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
        
        // Get indexes
        const indexes = await mongoose.connection.db.collection(coll.name).indexes();
        console.log(`- Indexes (${indexes.length}):`);
        indexes.forEach((idx, i) => {
          console.log(`  ${i + 1}. Name: ${idx.name}, Keys: ${JSON.stringify(idx.key)}`);
          if (idx.unique) console.log('     Unique:', idx.unique);
          if (idx.partialFilterExpression) console.log('     Partial Filter:', JSON.stringify(idx.partialFilterExpression));
        });
      } catch (err) {
        console.error(`Error getting stats for collection ${coll.name}:`, err.message);
      }
    }
    
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  } finally {
    // Close the connection
    if (mongoose.connection.readyState === 1) { // 1 = connected
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
    process.exit(0);
  }
}

checkConnection();
