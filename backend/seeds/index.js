const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config({ path: '../config/config.env' });

// Load models
const Farm = require('../models/Farm');
const User = require('../models/User');
const Cattle = require('../models/Cattle');
const HealthReading = require('../models/HealthReading');

// Connect to DB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false
});

// Read JSON files
const farms = JSON.parse(
  fs.readFileSync(path.join(__dirname, '_data', 'farms.json'), 'utf-8')
);

const users = JSON.parse(
  fs.readFileSync(path.join(__dirname, '_data', 'users.json'), 'utf-8')
);

const cattle = JSON.parse(
  fs.readFileSync(path.join(__dirname, '_data', 'cattle.json'), 'utf-8')
);

const healthReadings = JSON.parse(
  fs.readFileSync(path.join(__dirname, '_data', 'healthReadings.json'), 'utf-8')
);

// Import into DB
const importData = async () => {
  try {
    await Farm.create(farms);
    await User.create(users);
    await Cattle.create(cattle);
    await HealthReading.create(healthReadings);
    
    console.log('Data Imported...');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// Delete data
const deleteData = async () => {
  try {
    await Farm.deleteMany();
    await User.deleteMany();
    await Cattle.deleteMany();
    await HealthReading.deleteMany();
    
    console.log('Data Destroyed...');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// Handle command line arguments
if (process.argv[2] === '-i') {
  importData();
} else if (process.argv[2] === '-d') {
  deleteData();
} else {
  console.log('Please specify -i to import data or -d to delete data');
  process.exit(1);
}
