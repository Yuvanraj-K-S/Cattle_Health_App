const { MongoClient } = require('mongodb');

// MongoDB connection string from config
const mongoURI = 'mongodb://localhost:27017';
const dbName = 'cattleMonitor';

async function testConnection() {
  const client = new MongoClient(mongoURI, {
    connectTimeoutMS: 5000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 10000,
  });

  try {
    console.log('Attempting to connect to MongoDB...');
    await client.connect();
    console.log('✅ Successfully connected to MongoDB server');
    
    // List all databases
    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();
    console.log('\nAvailable databases:');
    dbs.databases.forEach(db => console.log(`- ${db.name} (size: ${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`));
    
    // Check if our database exists
    const dbExists = dbs.databases.some(db => db.name === dbName);
    console.log(`\nDatabase '${dbName}' exists:`, dbExists ? '✅ Yes' : '❌ No');
    
    if (dbExists) {
      const db = client.db(dbName);
      
      // List collections
      const collections = await db.listCollections().toArray();
      console.log(`\nCollections in '${dbName}':`);
      if (collections.length === 0) {
        console.log('  No collections found');
      } else {
        collections.forEach((coll, i) => {
          console.log(`  ${i + 1}. ${coll.name}`);
        });
      }
      
      // Get stats for the cattle collection if it exists
      const cattleColl = collections.find(c => c.name === 'cattle');
      if (cattleColl) {
        const stats = await db.collection('cattle').stats();
        console.log('\nCattle collection stats:');
        console.log(`- Document count: ${stats.count}`);
        console.log(`- Size: ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`- Storage size: ${(stats.storageSize / 1024).toFixed(2)} KB`);
        console.log(`- Indexes: ${stats.nindexes}`);
        
        // Get sample documents
        const sample = await db.collection('cattle').findOne({});
        console.log('\nSample document:');
        console.log(JSON.stringify(sample, null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:');
    console.error(error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\nThis usually means MongoDB is not running or not accessible.');
      console.error('Please ensure MongoDB is installed and the service is running.');
      console.error('On Windows, you can start it with: net start MongoDB');
      console.error('On macOS with Homebrew: brew services start mongodb-community');
      console.error('On Linux (Ubuntu/Debian): sudo systemctl start mongod');
    }
  } finally {
    await client.close();
    process.exit(0);
  }
}

testConnection();
