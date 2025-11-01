import express from 'express';
import { connectMongoose } from '../lib/mongoose.js';
import Recipe from '../models/Recipe.js';
import { getModel } from '../config/gemini.js';
import { uploadImageToCloudinary } from '../lib/cloudinary.js';
import User from '../models/User.js';
import { getCollection } from '../lib/db.js';

const router = express.Router();

// POST /api/photo-recipe - Generate recipe from photo
router.post('/', async (req, res) => {
  try {
    const { imageBase64, userId, mode = 'recipe' } = req.body;

    // Validation
    if (!imageBase64 || !userId) {
      return res.status(400).json({
        error: 'imageBase64 and userId are required'
      });
    }

    if (mode !== 'recipe' && mode !== 'ingredients') {
      return res.status(400).json({
        error: 'mode must be either "recipe" or "ingredients"'
      });
    }

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
      console.error('[PhotoRecipe] Error checking user:', userCheckError);
      return res.status(500).json({
        error: 'Lỗi xác thực người dùng. Vui lòng thử lại sau.'
      });
    }

    // Upload image to Cloudinary before processing
    let imageUrl = null;
    try {
      console.log('[PhotoRecipe] Uploading image to Cloudinary...');
      imageUrl = await uploadImageToCloudinary(imageBase64, 'angi-images');
      console.log('[PhotoRecipe] Image uploaded successfully:', imageUrl);
    } catch (uploadError) {
      console.error('[PhotoRecipe] Failed to upload to Cloudinary:', uploadError);
      // Continue processing even if upload fails - imageUrl will be null
    }

    // Get Gemini model with vision support
    let model = await getModel([]);

    let prompt = '';
    let systemInstructions = '';

    if (mode === 'recipe') {
      // Analyze what dish this is and provide recipe
      systemInstructions = `Bạn là một đầu bếp chuyên nghiệp. Hãy phân tích ảnh món ăn và đưa ra:
1. Nhận biết món ăn (tên món)
2. Công thức nấu món đó
3. Nguyên liệu cần thiết
4. Các bước thực hiện chi tiết`;

      prompt = `Hãy phân tích ảnh món ăn này và đưa ra:
1. Tên món ăn
2. Công thức nấu (chi tiết, dễ hiểu cho người mới bắt đầu)
3. Nguyên liệu cần thiết
4. Các bước thực hiện

Trả về dưới dạng JSON (KHÔNG có markdown, chỉ JSON thuần):
{
  "dishName": "Tên món ăn",
  "description": "Mô tả ngắn gọn về món ăn",
  "difficulty": "Độ khó (Dễ/Trung Bình/Khó)",
  "prepTime": "Thời gian chuẩn bị (ví dụ: '15 phút')",
  "cookTime": "Thời gian nấu (ví dụ: '30 phút')",
  "totalTime": "Tổng thời gian (ví dụ: '45 phút')",
  "servings": "Số khẩu phần (ví dụ: '2-3 người')",
  "ingredientsList": [
    {
      "name": "Tên nguyên liệu",
      "amount": "Số lượng (ví dụ: '200g', '2 muỗng canh')",
      "required": true
    }
  ],
  "steps": [
    "Bước 1: Hướng dẫn chi tiết",
    "Bước 2: Hướng dẫn chi tiết",
    "..."
  ],
  "tips": "Mẹo nhỏ khi nấu món này",
  "equipment": "Dụng cụ cần thiết"
}`;

    } else if (mode === 'ingredients') {
      // Analyze ingredients and suggest recipes
      systemInstructions = `Bạn là một chuyên gia nhận diện thực phẩm và tạo công thức. Hãy phân tích các nguyên liệu có trong ảnh và đưa ra các công thức nấu ăn phù hợp.`;

      prompt = `Hãy phân tích các nguyên liệu có trong ảnh này và đưa ra:
1. Danh sách các nguyên liệu nhận diện được
2. 3-5 công thức món ăn có thể nấu với các nguyên liệu này
3. Mỗi món ăn bao gồm tên món, mô tả, và danh sách nguyên liệu bổ sung cần thiết

Trả về dưới dạng JSON (KHÔNG có markdown, chỉ JSON thuần):
{
  "detectedIngredients": [
    "Nguyên liệu 1",
    "Nguyên liệu 2",
    "..."
  ],
  "suggestedRecipes": [
    {
      "title": "Tên món ăn",
      "description": "Mô tả ngắn gọn",
      "difficulty": "Độ khó",
      "prepTime": "Thời gian chuẩn bị",
      "cookTime": "Thời gian nấu",
      "totalTime": "Tổng thời gian",
      "ingredientsList": [
        {
          "name": "Tên nguyên liệu",
          "amount": "Số lượng",
          "required": true
        }
      ],
      "steps": [
        "Bước 1: ...",
        "Bước 2: ..."
      ],
      "tips": "Mẹo nhỏ"
    }
  ]
}`;

    }

    // Call Gemini Vision API
    const tryCall = async () => {
      // For vision, we need to use generateContent with parts including image
      const parts = [
        { text: prompt },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: imageBase64
          }
        }
      ];
      
      const result = await model.generateContent(parts);
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
        : (lastErr?.message || 'Không thể phân tích ảnh');
      return res.status(503).json({ error: message });
    }

    // Parse JSON from response
    let result;
    try {
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/```\n?/g, '');
      }
      result = JSON.parse(cleanText);
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      console.error('Raw response:', text);
      return res.status(500).json({
        error: 'Failed to parse AI response',
        rawResponse: text
      });
    }

    // Save to history if it's a recipe
    if (mode === 'recipe' && result.dishName) {
      try {
        await connectMongoose();
        const fullRecipe = {
          ...result,
          createdAt: new Date().toISOString(),
          userId: userId,
          sourceIngredients: '',
          userPreferences: {
            difficulty: result.difficulty || 'Dễ',
            timeRange: '',
            servings: result.servings || '1-2 người'
          }
        };
        const doc = await Recipe.create({ 
          userId, 
          recipe: fullRecipe, 
          sourceIngredients: 'Photo scan', 
          sourceType: 'photo-recipe',
          imageUrl: imageUrl // Use uploaded Cloudinary URL
        });
        result.id = doc._id;
      } catch (dbErr) {
        console.error('Failed to save to history:', dbErr);
        // Continue anyway
      }
    }

    // Save to history if it's ingredients mode with suggested recipes
    if (mode === 'ingredients' && result.suggestedRecipes && Array.isArray(result.suggestedRecipes)) {
      try {
        await connectMongoose();
        // Save each suggested recipe to history
        const savedIds = [];
        for (const suggestedRecipe of result.suggestedRecipes) {
          const fullRecipe = {
            ...suggestedRecipe,
            detectedIngredients: result.detectedIngredients || [],
            createdAt: new Date().toISOString(),
            userId: userId,
            sourceIngredients: result.detectedIngredients?.join(', ') || '',
            userPreferences: {
              difficulty: suggestedRecipe.difficulty || 'Dễ',
              timeRange: '',
              servings: suggestedRecipe.servings || '1-2 người'
            }
          };
          const doc = await Recipe.create({ 
            userId, 
            recipe: fullRecipe, 
            sourceIngredients: result.detectedIngredients?.join(', ') || '', 
            sourceType: 'photo-ingredients',
            imageUrl: imageUrl // Use uploaded Cloudinary URL (same for all suggested recipes)
          });
          savedIds.push(doc._id);
        }
        result.savedIds = savedIds;
      } catch (dbErr) {
        console.error('Failed to save suggested recipes to history:', dbErr);
        // Continue anyway
      }
    }

    return res.status(200).json({ success: true, result });

  } catch (error) {
    console.error('Error in photo recipe API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;

