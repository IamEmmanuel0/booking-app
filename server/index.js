require('dotenv').config();
const express = require('express');
const authRouter = require('./routes/auth');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors()); // Enable CORS for all routes

// Routes
app.get('/', (req, res) => res.send('Hello World!'));

app.use('/api/auth', authRouter)

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});