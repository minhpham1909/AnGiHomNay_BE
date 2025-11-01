import express from 'express';
import { connectMongoose } from '../lib/mongoose.js';
import Recipe from '../models/Recipe.js';
import ShoppingList from '../models/ShoppingList.js';
import { getUserProfile } from '../lib/db.js';
import { getModel } from '../config/gemini.js';
import User from '../models/User.js';
import { getCollection } from '../lib/db.js';

const router = express.Router();

// POST /api/shopping-list - Generate shopping list based on user's history and dietary preferences
router.post('/', async (req, res) => {
  try {
    const { userId, days, servings, priceRange } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'userId is required'
      });
    }

    const daysCount = parseInt(days) || 7; // Default 7 days
    if (daysCount < 1 || daysCount > 7) {
      return res.status(400).json({
        error: 'days must be between 1 and 7'
      });
    }

    const servingsCount = parseInt(servings) || 2; // Default 2 people
    const hasPriceLimit = priceRange && typeof priceRange.min === 'number' && typeof priceRange.max === 'number';
    const priceMin = hasPriceLimit ? priceRange.min : null;
    const priceMax = hasPriceLimit ? priceRange.max : null;

    // Validate user exists
    try {
      await connectMongoose();
      const user = await User.findOne({ userId }).lean();
      if (!user) {
        // Try native MongoDB as fallback
        const usersCollection = await getCollection('users');
        const nativeUser = await usersCollection.findOne({ userId });
        if (!nativeUser) {
          return res.status(404).json({
            error: 'Người dùng không tồn tại'
          });
        }
      }
    } catch (userCheckError) {
      console.error('[ShoppingList] Error checking user:', userCheckError);
      return res.status(500).json({
        error: 'Lỗi xác thực người dùng. Vui lòng thử lại sau.'
      });
    }

    // Get user profile for dietary preferences
    const userProfile = await getUserProfile(userId);
    const { dietaryPreferences, customDietary, allergies } = userProfile;

    // Get user's recipe history to understand their cooking patterns
    await connectMongoose();
    const recentRecipes = await Recipe.find({ userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    // Extract common ingredients from recipes
    const allIngredients = new Set();
    recentRecipes.forEach(recipe => {
      if (recipe.recipe?.ingredientsList && Array.isArray(recipe.recipe.ingredientsList)) {
        recipe.recipe.ingredientsList.forEach(ing => {
          if (ing.name) {
            allIngredients.add(ing.name.toLowerCase().trim());
          }
        });
      }
      if (recipe.recipe?.optionalIngredients && Array.isArray(recipe.recipe.optionalIngredients)) {
        recipe.recipe.optionalIngredients.forEach(ing => {
          if (ing.name) {
            allIngredients.add(ing.name.toLowerCase().trim());
          }
        });
      }
    });

    const ingredientsList = Array.from(allIngredients);

    // Build prompt for AI
    let prompt = `Bạn là một chuyên gia dinh dưỡng và lập danh sách mua sắm thông minh. Hãy tạo một danh sách mua sắm TỐI ƯU cho ${daysCount} ngày dựa trên thông tin sau:

THÔNG TIN NGƯỜI DÙNG:
1. Người dùng thường sử dụng các nguyên liệu sau (dựa trên lịch sử nấu ăn): ${ingredientsList.join(', ')}

2. Số ngày cần mua: ${daysCount} ngày

3. Số lượng người: ${servingsCount} người`;

    // Add price range if provided
    if (hasPriceLimit) {
      prompt += `\n\n💰 GIỚI HẠN GIÁ: Tổng chi phí mua sắm phải nằm trong khoảng ${priceMin.toLocaleString('vi-VN')} - ${priceMax.toLocaleString('vi-VN')} VNĐ. Hãy ưu tiên các nguyên liệu có giá hợp lý và tính toán số lượng phù hợp để không vượt quá ngân sách.`;
    }

    // Add dietary preferences
    if (dietaryPreferences && dietaryPreferences !== 'default') {
      const dietaryMap = {
        'vegetarian': 'ăn chay (không thịt, chỉ rau củ và các sản phẩm từ sữa/trứng)',
        'vegan': 'thuần chay (không có bất kỳ sản phẩm động vật nào)',
        'keto': 'ăn kiêng Keto (ít carb, nhiều chất béo)',
        'paleo': 'ăn kiêng Paleo (thực phẩm tự nhiên, không chế biến)',
        'halal': 'theo chế độ Halal',
        'kosher': 'theo chế độ Kosher',
        'diet': 'ăn kiêng giảm cân (ít calo, lành mạnh, hỗ trợ giảm cân)',
        'gym': 'chế độ ăn cho người tập gym (nhiều protein, hỗ trợ tăng cơ, phục hồi sau tập)'
      };

      let dietaryDescription;
      if (dietaryPreferences === 'custom' && customDietary) {
        dietaryDescription = customDietary;
        prompt += `\n3. Chế độ ăn TÙY CHỈNH: "${customDietary}". Danh sách mua sắm PHẢI tuân thủ nghiêm ngặt chế độ này.`;
      } else {
        dietaryDescription = dietaryMap[dietaryPreferences] || dietaryPreferences;
        prompt += `\n3. Chế độ ăn: ${dietaryDescription}`;
      }
    }

    // Add allergies
    if (allergies && allergies.length > 0) {
      prompt += `\n\n⚠️ QUAN TRỌNG - DỊ ỨNG: Tuyệt đối KHÔNG bao gồm các nguyên liệu sau: ${allergies.join(', ')}`;
    }

    prompt += `

YÊU CẦU DANH SÁCH MUA SẮM:
1. Danh sách phải BẰNG TIẾNG VIỆT và phân loại theo danh mục (rau củ, thịt cá, gia vị, đồ khô...)
2. Tính toán số lượng phù hợp cho ${daysCount} ngày và ${servingsCount} người (không quá thừa, không thiếu)
3. Ưu tiên các nguyên liệu phổ biến, dễ mua, giá rẻ${hasPriceLimit ? ` và nằm trong ngân sách ${priceMin.toLocaleString('vi-VN')} - ${priceMax.toLocaleString('vi-VN')} VNĐ` : ''}
4. Tận dụng việc người dùng thường dùng: ${ingredientsList.join(', ')}
5. Gợi ý món ăn có thể nấu với các nguyên liệu này
6. Bao gồm cả gia vị cơ bản nếu thiếu${hasPriceLimit ? '\n7. TÍNH TOÁN CẨN THẬN: Đảm bảo tổng chi phí ước tính không vượt quá ngân sách được cung cấp' : ''}

Hãy trả về kết quả dưới dạng JSON với cấu trúc chính xác như sau (KHÔNG có markdown, chỉ JSON thuần):
{
  "shoppingList": [
    {
      "category": "Tên danh mục (ví dụ: Rau củ, Thịt cá, Gia vị, Đồ khô...)",
      "items": [
        {
          "name": "Tên nguyên liệu",
          "amount": "Số lượng (ví dụ: '500g', '2 bịch', '1 hộp')",
          "essential": true
        }
      ]
    }
  ],
  "suggestedRecipes": [
    "Gợi ý các món ăn có thể nấu (tối đa 5 món, mỗi món 1 câu ngắn gọn)"
  ],
  "totalEstimatedCost": "Ước tính chi phí (ví dụ: '500,000 - 700,000 VNĐ')",
  "tips": "Mẹo tiết kiệm khi mua sắm và bảo quản thực phẩm"
}`;

    // Get Gemini model
    let model = await getModel([]);

    // Call Gemini API with retry
    const tryCall = async () => {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    };

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const backoffs = [500, 1000, 2000];
    let text;
    let lastErr;
    for (let i = 0; i < backoffs.length; i++) {
      try {
        text = await tryCall();
        lastErr = undefined;
        break;
      } catch (e) {
        lastErr = e;
        const status = e?.status;
        if (status === 503) {
          await sleep(backoffs[i]);
          continue;
        }
        break;
      }
    }

    if (!text && lastErr?.status === 503) {
      try {
        model = await getModel([(model && (model.model || model.options?.model)) || '']);
        text = await tryCall();
      } catch (e2) {
        lastErr = e2;
      }
    }

    if (!text) {
      const message = lastErr?.status === 503
        ? 'Mô hình AI đang quá tải, vui lòng thử lại sau.'
        : (lastErr?.message || 'Không thể tạo danh sách mua sắm');
      return res.status(503).json({ error: message });
    }

    // Parse JSON from response
    let shoppingList;
    try {
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/```\n?/g, '');
      }
      shoppingList = JSON.parse(cleanText);
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      console.error('Raw response:', text);
      return res.status(500).json({
        error: 'Failed to parse AI response',
        rawResponse: text
      });
    }

    // Validate structure
    if (!shoppingList.shoppingList || !Array.isArray(shoppingList.shoppingList)) {
      return res.status(500).json({
        error: 'Invalid shopping list structure from AI',
        shoppingList
      });
    }

    // Add metadata
    shoppingList.generatedAt = new Date().toISOString();
    shoppingList.days = daysCount;

    // Save to database
    try {
      await connectMongoose();
      const savedDoc = await ShoppingList.create({
        userId,
        shoppingList,
        days: daysCount,
        servings: servings || servingsCount.toString(),
        priceRange: hasPriceLimit ? { min: priceMin, max: priceMax } : null,
      });
      
      return res.status(200).json({ 
        success: true, 
        shoppingList,
        id: savedDoc._id 
      });
    } catch (dbErr) {
      console.error('Failed to save shopping list:', dbErr);
      // Still return shopping list even if DB save fails
      return res.status(200).json({ 
        success: true, 
        shoppingList 
      });
    }

  } catch (error) {
    console.error('Error in shopping list API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/shopping-list/user/:userId - Get user's shopping list history
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        error: 'userId is required'
      });
    }

    await connectMongoose();
    const shoppingLists = await ShoppingList.find({ userId })
      .sort({ createdAt: -1 }) // Newest first
      .lean();

    return res.status(200).json({
      success: true,
      shoppingLists
    });
  } catch (error) {
    console.error('Error fetching shopping list history:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// DELETE /api/shopping-list/:id - Delete a shopping list
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        error: 'userId is required'
      });
    }

    await connectMongoose();
    const result = await ShoppingList.findOneAndDelete({
      _id: id,
      userId
    });

    if (!result) {
      return res.status(404).json({
        error: 'Shopping list không tồn tại hoặc không thuộc về người dùng này'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Đã xóa danh sách mua sắm'
    });
  } catch (error) {
    console.error('Error deleting shopping list:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;

