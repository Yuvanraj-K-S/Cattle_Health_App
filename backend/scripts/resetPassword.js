const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/cattleMonitor', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function resetPassword(email, newPassword) {
  try {
    // Find the user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      console.error('User not found');
      process.exit(1);
    }
    
    console.log('Found user:', user.email);
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update the user's password
    user.password = hashedPassword;
    await user.save();
    
    console.log('Password updated successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting password:', error);
    process.exit(1);
  }
}

// Get email and new password from command line arguments
const [email, newPassword] = process.argv.slice(2);

if (!email || !newPassword) {
  console.error('Usage: node resetPassword.js <email> <newPassword>');
  process.exit(1);
}

resetPassword(email, newPassword);
