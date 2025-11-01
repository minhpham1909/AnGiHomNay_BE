import express from 'express';
import { connectMongoose } from '../lib/mongoose.js';
import Recipe from '../models/Recipe.js';
import { validateUserExists } from '../middleware/auth.js';

const router = express.Router();

// List recipes for a user
// Returns all recipes for the user, sorted by creation date (newest first)
router.get('/user/:userId', validateUserExists, async (req, res) => {
  try {
    await connectMongoose();
    const { userId } = req.params;
    
    // Get all recipes for user, sorted by creation date (newest first)
    const list = await Recipe.find({ userId }).sort({ createdAt: -1 }).lean();
    res.json({ recipes: list });
  } catch (e) {
    console.error('Error getting recipes:', e);
    res.status(500).json({ error: 'Cannot get recipes' });
  }
});

// Delete recipe
router.delete('/:id', async (req, res) => {
  try {
    await connectMongoose();
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const deleted = await Recipe.deleteOne({ _id: req.params.id, userId });
    res.json({ success: deleted.deletedCount === 1 });
  } catch (e) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

export default router;


