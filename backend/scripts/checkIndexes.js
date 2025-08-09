const mongoose = require('mongoose');
const Cattle = require('../models/Cattle');
require('dotenv').config();

// Load environment variables
require('dotenv').config({ path: '../.env' });

// Get MongoDB URI from environment or use default
const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/cattle-health';
console.log('Connecting to MongoDB with URI:', mongoURI.replace(/:([^:]*?)@/, ':***@')); // Mask password

async function checkIndexes() {
  try {
    // Connect to MongoDB with more detailed options
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      family: 4, // Use IPv4, skip trying IPv6
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('MongoDB connected successfully to database:', mongoose.connection.db.databaseName);
    
    // Log MongoDB server info
    const adminDb = mongoose.connection.db.admin();
    const serverStatus = await adminDb.serverStatus();
    console.log('MongoDB server version:', serverStatus.version);
    console.log('MongoDB host:', mongoose.connection.host);
    console.log('MongoDB port:', mongoose.connection.port);

    // Get the collection
    const collection = mongoose.connection.db.collection('cattle');
    
    // Get current indexes
    const indexes = await collection.indexes();
    console.log('Current indexes on cattle collection:');
    console.log(JSON.stringify(indexes, null, 2));

    // Get collection stats
    const stats = await collection.stats();
    console.log('\nCollection stats:');
    console.log(`- Document count: ${stats.count}`);
    console.log(`- Size on disk: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`- Storage size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`- Index sizes: ${Object.entries(stats.indexSizes).map(([k, v]) => `${k}: ${(v / 1024).toFixed(2)} KB`).join(', ')}`);

    // Get query execution plan for a simple query
    const explain = await collection.find({ farm: { $exists: true } })
      .limit(1)
      .explain('executionStats');
      
    console.log('\nQuery execution plan:');
    console.log(JSON.stringify({
      executionTimeMillis: explain.executionStats.executionTimeMillis,
      nReturned: explain.executionStats.nReturned,
      totalKeysExamined: explain.executionStats.totalKeysExamined,
      totalDocsExamined: explain.executionStats.totalDocsExamined,
      executionStages: explain.executionStats.executionStages.stage,
      indexFilterSet: explain.executionStats.executionStages.isEOF ? 'No' : 'Yes'
    }, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error checking indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

checkIndexes();
