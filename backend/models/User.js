const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 6,
        select: false
    },
    farmId: {
        type: String,
        unique: true,
        required: [true, 'Farm ID is required'],
        default: function() {
            return 'FARM' + Math.random().toString(36).substring(2, 10).toUpperCase();
        }
    },
    healthy_cattle_count: {
        type: Number,
        default: 0,
        min: 0
    },
    risky_cattle_count: {
        type: Number,
        default: 0,
        min: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Method to check password
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

// Generate farm ID
userSchema.statics.generateFarmId = function() {
    return 'FARM' + Math.random().toString(36).substring(2, 10).toUpperCase();
};

const User = mongoose.model('User', userSchema);

module.exports = User;
