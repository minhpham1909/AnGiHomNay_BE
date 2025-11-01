import mongoose from '../lib/mongoose.js';

const recipeSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true },
    recipe: { type: mongoose.Schema.Types.Mixed, required: true },
    sourceIngredients: { type: String },
    sourceType: { type: String, enum: ['prompt', 'photo-recipe', 'photo-ingredients'], default: 'prompt' },
    imageUrl: { type: String },
    // isSaved removed - all recipes are kept in history
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

export default mongoose.models.Recipe || mongoose.model('Recipe', recipeSchema);


