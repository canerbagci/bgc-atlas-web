require('dotenv').config();

const { Pool } = require('pg');

// Create a PostgreSQL pool for multiple connections
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    // ssl: process.env.NODE_ENV === 'production' ? true : {
    //     rejectUnauthorized: false
    // },
});

module.exports = { pool };
