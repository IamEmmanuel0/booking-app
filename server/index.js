require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { pool } = require('./config/database');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors()); // Enable CORS for all routes

// connect database
pool.connect()
  .then(() => console.log('Connected to the database'))
  .catch(err => console.error('Database connection error', err));

// Routes
app.get('/', (req, res) => res.send('Hello World!'));

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});