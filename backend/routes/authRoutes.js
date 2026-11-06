const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const { ensureDbConnected } = require('../db');

const router = express.Router();

// Email validation helper
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const isConnected = await ensureDbConnected();
    if (!isConnected) {
      return res.status(503).json({ message: 'Database connection unavailable. Please try again shortly.' });
    }

    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ message: 'Password is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Validate email format
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Check for existing user
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    // Hash password with bcryptjs
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create and save user
    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword
    });

    await user.save();

    return res.status(201).json({
      message: 'Registration successful'
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Internal server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const isConnected = await ensureDbConnected();
    if (!isConnected) {
      return res.status(503).json({ message: 'Database connection unavailable. Please try again shortly.' });
    }

    const { email, password } = req.body;

    // Validate input presence
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Compare password with hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Sign JWT
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '1d'
      }
    );

    // Return response without password or hash
    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error during login' });
  }
});

// GET /api/auth/me (Protected route to verify authMiddleware)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Auth verification error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
