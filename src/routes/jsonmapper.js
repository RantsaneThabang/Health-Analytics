const express = require('express'); // Import express module
const { Pool } = require('pg');
const router = express.Router(); // Use express.Router()

// Define your routes here




const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'hapi',
  password: 'admin',
  port: 5432,
});

module.exports = router; // Export the router