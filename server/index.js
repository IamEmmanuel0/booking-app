require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRouter = require('./routes/auth');
const doctorRouter = require('./routes/doctors');
const adminRouter = require('./routes/admin');
const profileRouter = require('./routes/profile');
const appointmentRouter = require('./routes/appointments');
const { authenticateToken, authorizeRole } = require('./middleware');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors()); // Enable CORS for all routes

// Routes
app.get('/', (req, res) => res.send('Hello World!'));

app.use('/api/auth', authRouter)
app.use('/api/doctors', doctorRouter)
app.use('/api/admin',  authenticateToken, authorizeRole('admin'), adminRouter)
app.use('/api/profile', authenticateToken, profileRouter)
app.use('/api/appointments', authenticateToken, appointmentRouter)

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});