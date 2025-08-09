const { MongoClient } = require('mongodb');

// MongoDB connection string
const mongoURI = 'mongodb://localhost:27017';
const dbName = 'cattleMonitor';
const collectionName = 'cattles';

async function checkIndexes() {
  const client = new MongoClient(mongoURI, {
    connectTimeoutMS: 5000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 10000,
  });

  try {
    console.log(`Connecting to MongoDB...`);
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    // Get collection stats
    console.log('\n=== Collection Stats ===');
    const stats = await collection.stats();
    console.log(`Collection: ${collectionName}`);
    console.log(`- Document count: ${stats.count}`);
    console.log(`- Size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`- Storage size: ${(stats.storageSize / 1024).toFixed(2)} KB`);
    console.log(`- Index count: ${stats.nindexes}`);
    console.log(`- Average document size: ${stats.avgObjSize} bytes`);
    
    // Get all indexes
    console.log('\n=== Indexes ===');
    const indexes = await collection.indexes();
    if (indexes.length === 0) {
      console.log('No indexes found!');
    } else {
      indexes.forEach((index, i) => {
        console.log(`\nIndex #${i + 1}:`);
        console.log(`- Name: ${index.name}`);
        console.log(`- Key: ${JSON.stringify(index.key)}`);
        if (index.unique) console.log('- Unique: true');
        if (index.background) console.log('- Background: true');
        if (index.sparse) console.log('- Sparse: true');
        if (index.partialFilterExpression) {
          console.log(`- Partial Filter: ${JSON.stringify(index.partialFilterExpression)}`);
        }
      });
    }
    
    // Get sample documents
    console.log('\n=== Sample Documents ===');
    const sampleDocs = await collection.find({}).limit(3).toArray();
    if (sampleDocs.length === 0) {
      console.log('No documents found in the collection.');
    } else {
      console.log(`Sample of ${sampleDocs.length} document(s):`);
      sampleDocs.forEach((doc, i) => {
        console.log(`\nDocument #${i + 1}:`);
        console.log(JSON.stringify(doc, null, 2));
      });
    }
    
    // Run explain on a simple query
    console.log('\n=== Query Performance ===');
    const explain = await collection.find({}).limit(1).explain('executionStats');
    console.log('Query execution stats:');
    console.log(`- Execution time: ${explain.executionStats.executionTimeMillis} ms`);
    console.log(`- Documents examined: ${explain.executionStats.totalDocsExamined}`);
    console.log(`- Keys examined: ${explain.executionStats.totalKeysExamined}`);
    console.log(`- Winning plan: ${explain.executionStats.executionStages.stage}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
    console.log('\nConnection closed.');
  }
}

checkIndexes();
