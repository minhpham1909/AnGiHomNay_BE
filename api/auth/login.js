import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getCollection } from '../../lib/db.js';

const router = express.Router();

// POST /api/auth/login
router.post('/', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email và mật khẩu là bắt buộc'
      });
    }

    // Find user by email
    const usersCollection = await getCollection('users');
    const user = await usersCollection.findOne({ email: email.toLowerCase().trim() });

    if (!user || !user.passwordHash) {
      return res.status(401).json({
        error: 'Email hoặc mật khẩu không đúng'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Email hoặc mật khẩu không đúng'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.userId, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '7d' } // Token expires in 7 days
    );

    // Update last login
    await usersCollection.updateOne(
      { userId: user.userId },
      { $set: { lastLoginAt: new Date().toISOString() } }
    );

    // Return user info (without password)
    const { passwordHash, ...userInfo } = user;

    res.json({
      success: true,
      token,
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
      }
    });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({
      error: 'Lỗi server. Vui lòng thử lại sau.'
    });
  }
});

export default router;

