import jwt from 'jsonwebtoken';
import { getCollection } from '../lib/db.js';
import User from '../models/User.js';
import { connectMongoose } from '../lib/mongoose.js';

/**
 * Middleware to validate JWT token and check if user exists
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 * @param {import('express').NextFunction} next 
 */
export async function validateToken(req, res, next) {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : req.headers['x-auth-token'] || req.query.token;

    if (!token) {
      return res.status(401).json({
        error: 'Token không được cung cấp'
      });
    }

    // Verify token
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
      return res.status(401).json({
        error: 'Token không hợp lệ hoặc đã hết hạn'
      });
    }

    // Check if user exists in database (try both MongoDB native and Mongoose)
    let userExists = false;
    
    // Try Mongoose first (for User model)
    try {
      await connectMongoose();
      const user = await User.findOne({ userId: decoded.userId }).lean();
      if (user) {
        userExists = true;
        req.user = { userId: decoded.userId, email: decoded.email };
      }
    } catch (err) {
      console.error('[Auth] Mongoose check failed:', err.message);
    }

    // If not found in Mongoose, try native MongoDB
    if (!userExists) {
      try {
        const usersCollection = await getCollection('users');
        const user = await usersCollection.findOne({ userId: decoded.userId });
        if (user) {
          userExists = true;
          req.user = { userId: decoded.userId, email: decoded.email };
        }
      } catch (err) {
        console.error('[Auth] Native MongoDB check failed:', err.message);
      }
    }

    if (!userExists) {
      return res.status(401).json({
        error: 'Người dùng không tồn tại hoặc đã bị xóa'
      });
    }

    next();
  } catch (error) {
    console.error('[Auth] Error validating token:', error);
    return res.status(500).json({
      error: 'Lỗi xác thực. Vui lòng thử lại sau.'
    });
  }
}

/**
 * Middleware to validate user exists (without token validation)
 * Useful for endpoints that get userId from params/body
 */
export async function validateUserExists(req, res, next) {
  try {
    const userId = req.params.userId || req.body.userId || req.query.userId;

    if (!userId) {
      return res.status(400).json({
        error: 'userId là bắt buộc'
      });
    }

    // Check if user exists in database
    let userExists = false;

    // Try Mongoose first
    try {
      await connectMongoose();
      const user = await User.findOne({ userId }).lean();
      if (user) {
        userExists = true;
        req.user = { userId: user.userId, email: user.email };
      }
    } catch (err) {
      console.error('[Auth] Mongoose check failed:', err.message);
    }

    // If not found, try native MongoDB
    if (!userExists) {
      try {
        const usersCollection = await getCollection('users');
        const user = await usersCollection.findOne({ userId });
        if (user) {
          userExists = true;
          req.user = { userId: user.userId, email: user.email };
        }
      } catch (err) {
        console.error('[Auth] Native MongoDB check failed:', err.message);
      }
    }

    if (!userExists) {
      return res.status(404).json({
        error: 'Người dùng không tồn tại'
      });
    }

    next();
  } catch (error) {
    console.error('[Auth] Error validating user:', error);
    return res.status(500).json({
      error: 'Lỗi xác thực. Vui lòng thử lại sau.'
    });
  }
}

