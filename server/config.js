if (process.env.NODE_ENV != 'production') require('dotenv').config();

module.exports = {
    DATABASE: process.env.MONGODB_URI,
    PORT: process.env.PORT,
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
    RESET_TOKEN_SECRET: process.env.RESET_TOKEN_SECRET
};