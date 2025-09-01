const mongoose = require('mongoose');
const Cattle = require('../models/Cattle');

async function fixDuplicateTagIds() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/cattleMonitor', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Find all cattle and group by tag_id
    const allCattle = await Cattle.find({});
    
    // Group by tag_id
    const tagIdMap = new Map();
    
    allCattle.forEach(cow => {
      if (!tagIdMap.has(cow.tag_id)) {
        tagIdMap.set(cow.tag_id, []);
      }
      tagIdMap.get(cow.tag_id).push(cow);
    });

    // Process duplicates
    let fixedCount = 0;
    
    for (const [tagId, entries] of tagIdMap.entries()) {
      if (entries.length > 1) {
        console.log(`\nFound ${entries.length} entries with tag_id: ${tagId}`);
        
        // Keep the first entry as is, update the rest
        for (let i = 1; i < entries.length; i++) {
          const cow = entries[i];
          const newTagId = `${tagId}_${i}`;
          
          console.log(`  Updating ${cow._id} (farm: ${cow.farm_id}): ${tagId} -> ${newTagId}`);
          
          // Update the tag_id
          await Cattle.findByIdAndUpdate(cow._id, { 
            $set: { tag_id: newTagId } 
          });
          
          // Also update any health readings that reference this tag_id
          await Cattle.updateMany(
            { 
              _id: { $ne: cow._id },
              'health_readings.tag_id': tagId 
            },
            { $set: { 'health_readings.$[elem].tag_id': newTagId } },
            { arrayFilters: [{ 'elem.tag_id': tagId }] }
          );
          
          fixedCount++;
        }
      }
    }

    if (fixedCount > 0) {
      console.log(`\n✅ Successfully fixed ${fixedCount} duplicate tag_ids`);
    } else {
      console.log('✅ No duplicate tag_ids found to fix');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixDuplicateTagIds();
