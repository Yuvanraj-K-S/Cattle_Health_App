const mongoose = require('mongoose');
const Cattle = require('../models/Cattle');

async function findDuplicates() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/cattleMonitor', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Find all cattle and check for duplicate tag_ids
    const allCattle = await Cattle.find({});
    
    // Group by tag_id
    const tagIdMap = new Map();
    
    allCattle.forEach(cow => {
      if (!tagIdMap.has(cow.tag_id)) {
        tagIdMap.set(cow.tag_id, []);
      }
      tagIdMap.get(cow.tag_id).push({
        _id: cow._id,
        farm_id: cow.farm_id,
        tag_id: cow.tag_id,
        health_status: cow.health_status
      });
    });

    // Find duplicates
    const duplicates = [];
    for (const [tagId, entries] of tagIdMap.entries()) {
      if (entries.length > 1) {
        duplicates.push({
          tag_id: tagId,
          count: entries.length,
          entries: entries
        });
      }
    }

    if (duplicates.length > 0) {
      console.log('⚠️ Found duplicate tag_ids:');
      console.log(JSON.stringify(duplicates, null, 2));
    } else {
      console.log('✅ No duplicate tag_ids found');
    }
    
    // Check for duplicate tag_id within the same farm
    const farmTagMap = new Map();
    const farmDuplicates = [];
    
    allCattle.forEach(cow => {
      const key = `${cow.farm_id}_${cow.tag_id}`;
      if (!farmTagMap.has(key)) {
        farmTagMap.set(key, []);
      }
      farmTagMap.get(key).push(cow._id);
    });

    for (const [key, ids] of farmTagMap.entries()) {
      if (ids.length > 1) {
        const [farmId, tagId] = key.split('_');
        farmDuplicates.push({
          farm_id: farmId,
          tag_id: tagId,
          count: ids.length,
          cattle_ids: ids
        });
      }
    }

    if (farmDuplicates.length > 0) {
      console.log('\n⚠️ Found duplicate tag_ids within the same farm:');
      console.log(JSON.stringify(farmDuplicates, null, 2));
    } else {
      console.log('✅ No duplicate tag_ids found within the same farm');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

findDuplicates();
