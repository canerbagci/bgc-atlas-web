require('dotenv').config();

const { Client } = require('pg');
const { Pool } = require('pg');

// Create a PostgreSQL client for single connections
const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    // ssl: process.env.NODE_ENV === 'production' ? true : {
    //     rejectUnauthorized: false
    // },
});

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

client.connect((err) => {
    if (err) {
        console.error('Error connecting to PostgreSQL:', err.stack);
    } else {
        console.log(`[${new Date().toISOString()}] Connected to PostgreSQL database`);
    }
});

module.exports = { client, pool };