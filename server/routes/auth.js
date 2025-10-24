require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const router = express.Router();

// ====================== REGISTER ======================
router.post('/register', async (req, res) => {
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
router.post('/login', async (req, res) => {
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

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.SECRET_KEY, { expiresIn: '30d' });
    res.json({ message: 'Login successful', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ====================== FORGOT PASSWORD ======================
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const result = await pool.query('SELECT id, email FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'No account found with this email' });

    const user = result.rows[0];

    // Generate JWT reset token (expires in 15 minutes)
    const resetToken = jwt.sign({ id: user.id, email: user.email }, process.env.SECRET_KEY, { expiresIn: '15m' });

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
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword)
      return res.status(400).json({ error: 'Token and new password are required' });

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.SECRET_KEY);
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

module.exports = router;