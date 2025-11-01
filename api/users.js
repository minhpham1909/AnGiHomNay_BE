import express from 'express';
import { connectMongoose } from '../lib/mongoose.js';
import User from '../models/User.js';
import { getCollection } from '../lib/db.js';

const router = express.Router();

router.get('/:userId', async (req, res) => {
  try {
    await connectMongoose();
    let user = await User.findOne({ userId: req.params.userId }).lean();
    if (!user) {
      // Try native MongoDB as fallback
      try {
        const usersCollection = await getCollection('users');
        const nativeUser = await usersCollection.findOne({ userId: req.params.userId });
        if (!nativeUser) {
          return res.status(404).json({ error: 'Người dùng không tồn tại' });
        }
        user = nativeUser;
      } catch (fallbackError) {
        return res.status(404).json({ error: 'Người dùng không tồn tại' });
      }
    }
    // Ensure new fields exist for legacy users
    const toSet = {};
    if (user.dateOfBirth === undefined) toSet.dateOfBirth = '';
    if (Object.keys(toSet).length) {
      await User.updateOne({ userId: req.params.userId }, { $set: toSet });
      user = { ...user, ...toSet };
    }
    res.json({ user });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:userId', async (req, res) => {
  try {
    await connectMongoose();
    const allowed = ['name','avatarUrl','gender','dateOfBirth','dietaryPreferences','customDietary','allergies'];
    const $set = {};
    for (const key of allowed) if (req.body[key] !== undefined) $set[key] = req.body[key];
    const user = await User.findOneAndUpdate(
      { userId: req.params.userId },
      { $set },
      { upsert: true, new: true }
    ).lean();
    res.json({ user });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;


