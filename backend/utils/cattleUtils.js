const User = require('../models/User');

/**
 * Updates the cattle counts for a user based on their cattle's health status
 * @param {string} userId - The ID of the user
 */
const updateUserCattleCounts = async (userId) => {
    try {
        const Cattle = require('../models/Cattle');
        
        // Count healthy and risky cattle for the user
        const [healthyCount, riskyCount] = await Promise.all([
            Cattle.countDocuments({ farm_id: userId, health_status: 'Healthy' }),
            Cattle.countDocuments({ farm_id: userId, health_status: 'At risk' })
        ]);

        // Update the user's cattle counts
        await User.findByIdAndUpdate(userId, {
            healthy_cattle_count: healthyCount,
            risky_cattle_count: riskyCount
        });

        return { healthyCount, riskyCount };
    } catch (error) {
        console.error('Error updating user cattle counts:', error);
        throw error;
    }
};

module.exports = {
    updateUserCattleCounts
};
