const mongoose = require('mongoose');
require('dotenv').config();
const Cattle = require('../models/Cattle');

// Get MongoDB URI from environment variable or use default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cattle_health_app';

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
    recalculateHealthStatus();
}).catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

async function recalculateHealthStatus() {
    try {
        console.log('Starting health status recalculation...');
        
        // Get all cattle
        const allCattle = await Cattle.find({});
        console.log(`Found ${allCattle.length} cattle to process`);
        
        let updatedCount = 0;
        
        // Process each cattle
        for (const cattle of allCattle) {
            if (!cattle.health_readings || cattle.health_readings.length === 0) {
                // No readings, set to unknown
                if (cattle.health_status !== 'Unknown') {
                    cattle.health_status = 'Unknown';
                    await cattle.save();
                    updatedCount++;
                }
                continue;
            }
            
            // Get the most recent reading
            const latestReading = cattle.health_readings.reduce((latest, current) => {
                return (new Date(current.recorded_at) > new Date(latest.recorded_at)) ? current : latest;
            }, cattle.health_readings[0]);
            
            // Determine health status based on the latest reading
            const newHealthStatus = latestReading.is_healthy ? 'Healthy' : 'At risk';
            
            // Update if different
            if (cattle.health_status !== newHealthStatus) {
                console.log(`Updating cattle ${cattle.tag_id} (${cattle._id}) from ${cattle.health_status} to ${newHealthStatus}`);
                cattle.health_status = newHealthStatus;
                await cattle.save();
                updatedCount++;
            }
        }
        
        console.log(`\nRecalculation complete!`);
        console.log(`Total cattle processed: ${allCattle.length}`);
        console.log(`Cattle updated: ${updatedCount}`);
        
        process.exit(0);
    } catch (error) {
        console.error('Error recalculating health status:', error);
        process.exit(1);
    }
}
