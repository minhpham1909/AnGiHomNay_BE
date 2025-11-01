import express from 'express';
import User from '../models/User.js';
import { connectMongoose } from '../lib/mongoose.js';
import { validateToken, validateUserExists } from '../middleware/auth.js';

const router = express.Router();

// POST /api/user/profile - Update or validate user profile
router.post('/', validateToken, async (req, res) => {
  try {
    await connectMongoose();
    const { userId, name, dietaryPreferences, customDietary, allergies, avatarUrl, gender, dateOfBirth } = req.body;
    
    // Use userId from token if not provided, or validate provided userId matches token
    const tokenUserId = req.user?.userId;
    if (!userId && !tokenUserId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    const targetUserId = userId || tokenUserId;
    
    // Verify user exists
    const user = await User.findOne({ userId: targetUserId }).lean();
    if (!user) {
      return res.status(404).json({ error: 'Người dùng không tồn tại' });
    }

    // If no update data provided, just return success (used for validation)
    if (!name && !dietaryPreferences && !customDietary && !allergies && !avatarUrl && !gender && !dateOfBirth) {
      return res.json({ success: true, user: { userId: user.userId, email: user.email, name: user.name } });
    }

    // Update profile
    const profileData = {
      ...(name !== undefined ? { name } : {}),
      ...(dietaryPreferences !== undefined ? { dietaryPreferences } : {}),
      ...(customDietary !== undefined ? { customDietary } : {}),
      ...(allergies !== undefined ? { allergies } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      ...(gender !== undefined ? { gender } : {}),
      ...(dateOfBirth !== undefined ? { dateOfBirth } : {}),
    };
    await User.findOneAndUpdate({ userId: targetUserId }, { $set: profileData }, { upsert: false });
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
