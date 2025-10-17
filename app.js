const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const crypto = require('crypto');
const app = express();

const port = 3000;
const SECRET_KEY = 'fuiniosnrjiwir';

// PostgreSQL connection pool
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "appdb",
  password: "2023",
  port: 5432
});

// Middleware
app.use(express.json());

// init db
const initDB = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      age INT DEFAULT 0,
      field VARCHAR(50) NOT NULL DEFAULT 'Backend',
      password VARCHAR(100) NOT NULL,
      reset_token VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    console.log('Database initialized');
  } catch (err) {
    console.error('Database initialization error:', err);
  }
};

initDB();

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

app.get('/', (req, res) => res.send('Hello World!'));

// ====================== REGISTER ======================
app.post('/register', async (req, res) => {
  try {
    const { email, name, password, age, field } = req.body;
    if (!email || !name || !password)
      return res.status(400).json({ error: 'Email, name, and password are required' });

    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users (email, name, password, age, field)
      VALUES ($1, $2, $3, $4, $5)
    `;
    await pool.query(query, [email, name, hashedPassword, age || 0, field || 'Backend']);
    res.status(201).json({ message: 'User registered successfully'});
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Email already exists" });
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// ====================== LOGIN ======================
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0)
      return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '30d' });
    res.json({ message: 'Login successful', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ====================== GET PROFILE ======================
app.get('/profile', authenticateToken, async (req, res) => {
  try {
    const query = 'SELECT id, email, name, age, field, created_at FROM users WHERE id = $1';
    const result = await pool.query(query, [req.user.id]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'User not found' });

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ====================== EDIT USER (email can't change) ======================
app.put('/edit-profile', authenticateToken, async (req, res) => {
  try {
    const { name, age, field } = req.body;
    const query = `
      UPDATE users SET name = $1, age = $2, field = $3
      WHERE id = $4 RETURNING id;
    `;
    const result = await pool.query(query, [name, age, field, req.user.id]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'User not found' });

    res.json({ message: 'Profile updated successfully', id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ====================== CHANGE PASSWORD ======================
app.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword)
      return res.status(400).json({ error: 'Old and new passwords are required' });

    const result = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(oldPassword, user.password);
    if (!validPassword)
      return res.status(401).json({ error: 'Old password is incorrect' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ====================== FORGOT PASSWORD ======================
app.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const result = await pool.query('SELECT id, email FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'No account found with this email' });

    const user = result.rows[0];

    // Generate JWT reset token (expires in 15 minutes)
    const resetToken = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '15m' });

    // Save reset token in database
    await pool.query('UPDATE users SET reset_token = $1 WHERE email = $2', [resetToken, email]);

    // Normally, send the reset link via email, e.g.:
    // `https://your-frontend.com/reset-password?token=${resetToken}`
    res.json({
      message: 'Password reset token generated',
      token: resetToken
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// ====================== RESET PASSWORD ======================
app.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword)
      return res.status(400).json({ error: 'Token and new password are required' });

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, SECRET_KEY);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    // Check if token matches the one stored in the database
    const result = await pool.query('SELECT * FROM users WHERE id = $1 AND reset_token = $2', [
      decoded.id,
      token
    ]);

    if (result.rows.length === 0)
      return res.status(400).json({ error: 'Invalid credentials' });

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await pool.query('UPDATE users SET password = $1, reset_token = NULL WHERE id = $2', [
      hashedPassword,
      decoded.id
    ]);

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ====================== SERVER ======================
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
