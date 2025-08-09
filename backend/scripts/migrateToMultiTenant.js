const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Farm = require('../models/Farm');
const Cattle = require('../models/Cattle');
const logger = require('../utils/logger');

// Load environment variables
dotenv.config({ path: '../.env' });

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    });
    logger.info('MongoDB Connected...');
  } catch (err) {
    logger.error(`Database connection error: ${err.message}`);
    process.exit(1);
  }
};

// Main migration function
const migrateToMultiTenant = async () => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    logger.info('Starting migration to multi-tenant architecture...');
    
    // Get all existing users
    const users = await User.find({}).session(session);
    logger.info(`Found ${users.length} users to migrate`);
    
    for (const user of users) {
      logger.info(`Processing user: ${user.email} (${user._id})`);
      
      // Create a default farm for the user if they don't have one
      const existingFarm = await Farm.findOne({ owner: user._id }).session(session);
      
      if (!existingFarm) {
        logger.info(`Creating default farm for user: ${user.email}`);
        
        const newFarm = new Farm({
          name: `${user.firstName || user.username}'s Farm`,
          owner: user._id,
          description: 'Default farm created during migration',
          users: [{
            user: user._id,
            role: 'owner',
            addedBy: user._id,
            isActive: true
          }],
          settings: {
            timezone: 'UTC',
            units: {
              temperature: 'celsius',
              weight: 'kg',
              distance: 'km'
            },
            alertThresholds: {
              temperature: { min: 38, max: 39.5 },
              heartRate: { min: 48, max: 84 }
            }
          }
        });
        
        await newFarm.save({ session });
        
        // Update user's farms array
        user.farms = [{
          farm: newFarm._id,
          role: 'owner',
          addedBy: user._id,
          isActive: true
        }];
        
        user.defaultFarm = newFarm._id;
        
        // If this is the first user, make them a super admin
        if (user._id.toString() === users[0]._id.toString()) {
          user.role = 'super_admin';
          logger.info(`Assigned super_admin role to user: ${user.email}`);
        }
        
        await user.save({ session });
        
        // Update all cattle owned by this user to belong to the new farm
        await Cattle.updateMany(
          { 'owner.user': user._id },
          { 
            $set: { 
              farm: newFarm._id,
              'owner.role': 'owner'
            } 
          },
          { session }
        );
        
        logger.info(`Created farm ${newFarm.name} (${newFarm._id}) for user ${user.email}`);
      } else {
        logger.info(`User ${user.email} already has a farm: ${existingFarm.name}`);
        
        // Ensure the user is added to their farm's users array
        const userInFarm = existingFarm.users.some(u => u.user.toString() === user._id.toString());
        
        if (!userInFarm) {
          existingFarm.users.push({
            user: user._id,
            role: 'owner',
            addedBy: user._id,
            isActive: true
          });
          await existingFarm.save({ session });
          logger.info(`Added user ${user.email} to their farm ${existingFarm.name}`);
        }
        
        // Update user's farms array if empty
        if (user.farms.length === 0) {
          user.farms = [{
            farm: existingFarm._id,
            role: 'owner',
            addedBy: user._id,
            isActive: true
          }];
          
          if (!user.defaultFarm) {
            user.defaultFarm = existingFarm._id;
          }
          
          await user.save({ session });
          logger.info(`Updated user ${user.email} with farm information`);
        }
      }
    }
    
    await session.commitTransaction();
    session.endSession();
    logger.info('Migration completed successfully!');
    process.exit(0);
    
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    logger.error(`Migration failed: ${error.message}`, { error });
    process.exit(1);
  }
};

// Run the migration
(async () => {
  try {
    await connectDB();
    await migrateToMultiTenant();
  } catch (error) {
    logger.error(`Migration error: ${error.message}`, { error });
    process.exit(1);
  }
})();
