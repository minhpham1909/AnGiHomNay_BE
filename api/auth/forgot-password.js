import express from 'express';
import crypto from 'crypto';
import { getCollection } from '../../lib/db.js';

const router = express.Router();

// POST /api/auth/forgot-password
router.post('/', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email là bắt buộc'
      });
    }

    const usersCollection = await getCollection('users');
    const user = await usersCollection.findOne({ email: email.toLowerCase().trim() });

    // Don't reveal if email exists (security best practice)
    // But for now, we'll return success either way

    if (user) {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date();
      resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // Expires in 1 hour

      // Save reset token to user
      await usersCollection.updateOne(
        { userId: user.userId },
        {
          $set: {
            resetToken,
            resetTokenExpiry: resetTokenExpiry.toISOString(),
          }
        }
      );

      // In production, send email here
      // For now, we'll log it (in production, remove this)
      console.log('=== RESET PASSWORD TOKEN ===');
      console.log(`Email: ${user.email}`);
      console.log(`Reset Token: ${resetToken}`);
      console.log(`Link: ${process.env.FRONTEND_URL || 'http://localhost:8081'}/(auth)/reset-password?token=${resetToken}`);
      console.log('===========================');

      // TODO: Send email with reset link
      // await sendResetEmail(user.email, resetToken);
    }

    // Always return success (don't reveal if email exists)
    res.json({
      success: true,
      message: 'Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu.'
    });
  } catch (error) {
    console.error('Error in forgot-password:', error);
    res.status(500).json({
      error: 'Lỗi server. Vui lòng thử lại sau.'
    });
  }
});

export default router;

