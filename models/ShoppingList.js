import mongoose from '../lib/mongoose.js';

const shoppingListSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true },
    shoppingList: { type: mongoose.Schema.Types.Mixed, required: true }, // Full shopping list data
    days: { type: Number, required: true },
    servings: { type: String },
    priceRange: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

export default mongoose.models.ShoppingList || mongoose.model('ShoppingList', shoppingListSchema);

