const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config');

// Generate JWT Token
const signToken = (id) => {
    return jwt.sign({ id }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN
    });
};

// Register a new user
exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                status: 'error',
                message: 'User already exists with this email'
            });
        }

        // Create new user with generated farmId
        const newUser = await User.create({
            name,
            email,
            password,
            farmId: User.generateFarmId()
        });

        // Generate JWT token with farmId
        const token = jwt.sign(
            { 
                id: newUser._id, 
                farmId: newUser.farmId,
                email: newUser.email,
                name: newUser.name
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
        
        // Remove password from output and ensure farmId is included
        const userData = newUser.toObject();
        delete userData.password;
        userData.farmId = newUser.farmId; // Ensure farmId is included

        res.status(201).json({
            status: 'success',
            token,
            data: {
                user: userData
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'error',
            message: err.message
        });
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1) Check if email and password exist
        if (!email || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Please provide email and password!'
            });
        }

        // 2) Check if user exists && password is correct
        const user = await User.findOne({ email }).select('+password');

        if (!user || !(await user.correctPassword(password, user.password))) {
            return res.status(401).json({
                status: 'error',
                message: 'Incorrect email or password'
            });
        }

        // 3) If everything ok, send token to client with farmId
        const token = jwt.sign(
            { 
                id: user._id, 
                farmId: user.farmId,
                email: user.email,
                name: user.name
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
        
        // Remove password from output and ensure farmId is included
        const userData = user.toObject();
        delete userData.password;
        userData.farmId = user.farmId; // Ensure farmId is included

        res.status(200).json({
            status: 'success',
            token,
            data: {
                user: userData
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'error',
            message: err.message
        });
    }
};

// Protect routes - check if user is authenticated
exports.protect = async (req, res, next) => {
    try {
        let token;
        // 1) Getting token and check if it's there
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                status: 'error',
                message: 'You are not logged in! Please log in to get access.'
            });
        }

        // 2) Verification token
        const decoded = await jwt.verify(token, JWT_SECRET);

        // 3) Check if user still exists
        const currentUser = await User.findById(decoded.id);
        if (!currentUser) {
            return res.status(401).json({
                status: 'error',
                message: 'The user belonging to this token does no longer exist.'
            });
        }

        // GRANT ACCESS TO PROTECTED ROUTE
        req.user = {
            id: currentUser._id,
            farmId: currentUser.farmId,
            email: currentUser.email,
            name: currentUser.name
        };
        next();
    } catch (err) {
        return res.status(401).json({
            status: 'error',
            message: 'Invalid token or session expired. Please log in again.'
        });
    }
};
