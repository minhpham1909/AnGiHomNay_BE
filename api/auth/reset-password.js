import express from 'express';
import bcrypt from 'bcrypt';
import { getCollection } from '../../lib/db.js';

const router = express.Router();

// POST /api/auth/reset-password
router.post('/', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        error: 'Token và mật khẩu mới là bắt buộc'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'Mật khẩu phải có ít nhất 6 ký tự'
      });
    }

    const usersCollection = await getCollection('users');
    const user = await usersCollection.findOne({ resetToken: token });

    if (!user) {
      return res.status(400).json({
        error: 'Token không hợp lệ hoặc đã hết hạn'
      });
    }

    // Check if token expired
    if (new Date() > new Date(user.resetTokenExpiry)) {
      return res.status(400).json({
        error: 'Token đã hết hạn. Vui lòng yêu cầu lại.'
      });
    }

    // Hash new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear reset token
    await usersCollection.updateOne(
      { userId: user.userId },
      {
        $set: {
          passwordHash,
          updatedAt: new Date().toISOString(),
        },
        $unset: {
          resetToken: '',
          resetTokenExpiry: '',
        }
      }
    );

    res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công'
    });
  } catch (error) {
    console.error('Error in reset-password:', error);
    res.status(500).json({
      error: 'Lỗi server. Vui lòng thử lại sau.'
    });
  }
});

export default router;

