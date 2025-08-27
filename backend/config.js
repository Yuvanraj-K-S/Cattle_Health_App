module.exports = {
    JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
    JWT_EXPIRES_IN: '90d',
    JWT_COOKIE_EXPIRES: 90
};
