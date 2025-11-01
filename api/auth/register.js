import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getCollection } from '../../lib/db.js';

const router = express.Router();

// POST /api/auth/register
router.post('/', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email và mật khẩu là bắt buộc'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Email không hợp lệ'
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Mật khẩu phải có ít nhất 6 ký tự'
      });
    }

    // Check if user already exists
    const usersCollection = await getCollection('users');
    const existingUser = await usersCollection.findOne({ email: email.toLowerCase().trim() });

    if (existingUser) {
      return res.status(409).json({
        error: 'Email này đã được sử dụng'
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate userId (simple approach - in production use UUID)
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create user
    const newUser = {
      userId,
      email: email.toLowerCase().trim(),
      passwordHash,
      name: name?.trim() || null,
      dietaryPreferences: 'default',
      customDietary: null,
      allergies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await usersCollection.insertOne(newUser);

    // Generate JWT token
    const token = jwt.sign(
      { userId, email: newUser.email },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '7d' }
    );

    // Return user info (without password)
    res.status(201).json({
      success: true,
      token,
      user: {
        userId,
        email: newUser.email,
        name: newUser.name,
      }
    });
  } catch (error) {
    console.error('Error in register:', error);
    res.status(500).json({
      error: 'Lỗi server. Vui lòng thử lại sau.'
    });
  }
});

export default router;

