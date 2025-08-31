const User = require('../models/User');

/**
 * Updates the cattle counts for a user based on their cattle's health status
 * @param {string} farmId - The farm ID of the user
 */
const updateUserCattleCounts = async (farmId) => {
    try {
        const Cattle = require('../models/Cattle');
        
        // Count healthy and risky cattle for the farm
        const [healthyCount, riskyCount] = await Promise.all([
            Cattle.countDocuments({ farm_id: farmId, health_status: 'Healthy' }),
            Cattle.countDocuments({ farm_id: farmId, health_status: 'At risk' })
        ]);

        // Find the user by farmId and update their cattle counts
        await User.findOneAndUpdate(
            { farmId: farmId },
            {
                healthy_cattle_count: healthyCount,
                risky_cattle_count: riskyCount
            }
        );

        return { healthyCount, riskyCount };
    } catch (error) {
        console.error('Error updating user cattle counts:', error);
        throw error;
    }
};

module.exports = {
    updateUserCattleCounts
};
