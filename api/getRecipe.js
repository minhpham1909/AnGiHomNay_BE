import express from 'express';
import { getUserProfile } from '../lib/db.js';
import { connectMongoose } from '../lib/mongoose.js';
import Recipe from '../models/Recipe.js';
import { getModel } from '../config/gemini.js';
import { validateUserExists } from '../middleware/auth.js';

const router = express.Router();

// POST /api/recipes - Generate recipe from ingredients
router.post('/', async (req, res) => {

  try {
    const { ingredients, userId, difficulty, timeRange, servings } = req.body;

    // Validate input
    if (!ingredients || !userId) {
      return res.status(400).json({
        error: 'Missing required fields: ingredients and userId are required'
      });
    }

    // Validate user exists
    try {
      await connectMongoose();
      const User = (await import('../models/User.js')).default;
      const user = await User.findOne({ userId }).lean();
      if (!user) {
        // Try native MongoDB as fallback
        const { getCollection } = await import('../lib/db.js');
        const usersCollection = await getCollection('users');
        const nativeUser = await usersCollection.findOne({ userId });
        if (!nativeUser) {
          return res.status(404).json({
            error: 'Người dùng không tồn tại'
          });
        }
      }
    } catch (userCheckError) {
      console.error('[GetRecipe] Error checking user:', userCheckError);
      // Continue anyway - getUserProfile will handle it
    }

    // Parse options với giá trị mặc định
    const selectedDifficulty = difficulty || 'Dễ'; // 'Dễ', 'Trung Bình', 'Khó'
    const selectedTimeRange = timeRange || '20~30 Phút'; // '5~10 Phút', '20~30 Phút', 'Hơn 1 Tiếng'
    const selectedServings = servings || '2'; // '1', '2', '3', '4', '5', hoặc số khác nếu 'Nhiều hơn'

    // Lấy thông tin profile của user (chế độ ăn, dị ứng)
    const userProfile = await getUserProfile(userId);

    const { dietaryPreferences, customDietary, allergies } = userProfile;

    // Khởi tạo Gemini AI model từ config (tự động chọn model tốt nhất)
    let triedModels = [];
    let model = await getModel(triedModels);

    // Map timeRange thành yêu cầu thời gian cụ thể cho AI
    let timeRequirement = '';
    if (selectedTimeRange === '5~10 Phút') {
      timeRequirement = 'Tổng thời gian nấu (từ chuẩn bị đến hoàn thành) phải từ 5-10 phút. Món ăn phải RẤT nhanh, đơn giản, có thể làm trong vài phút.';
    } else if (selectedTimeRange === '20~30 Phút') {
      timeRequirement = 'Tổng thời gian nấu (từ chuẩn bị đến hoàn thành) phải từ 20-30 phút. Món ăn vừa phải, cân bằng giữa tốc độ và chất lượng.';
    } else if (selectedTimeRange === 'Hơn 1 Tiếng') {
      timeRequirement = 'Tổng thời gian nấu (từ chuẩn bị đến hoàn thành) có thể hơn 1 giờ. Món ăn có thể phức tạp hơn, cần thời gian chế biến lâu hơn.';
    }

    // Map difficulty thành yêu cầu cụ thể
    let difficultyRequirement = '';
    if (selectedDifficulty === 'Dễ') {
      difficultyRequirement = 'Rất đơn giản, dễ làm, không cần kỹ thuật phức tạp. Phù hợp với người mới bắt đầu nấu ăn. Các bước hướng dẫn phải RẤT CHI TIẾT và dễ hiểu.';
    } else if (selectedDifficulty === 'Trung Bình') {
      difficultyRequirement = 'Độ khó trung bình, cần một số kỹ năng nấu ăn cơ bản. Có thể có vài bước phức tạp hơn nhưng vẫn dễ thực hiện.';
    } else if (selectedDifficulty === 'Khó') {
      difficultyRequirement = 'Độ khó cao hơn, có thể cần kỹ thuật nấu ăn nâng cao. Món ăn có thể có nhiều bước, yêu cầu sự tỉ mỉ và kinh nghiệm.';
    }

    // Map servings
    let servingsText = selectedServings === 'Nhiều hơn' 
      ? 'số người lớn (tùy chỉnh theo yêu cầu)'
      : `${selectedServings} người`;

    // Xây dựng prompt chi tiết - Tối ưu cho sinh viên/người trẻ
    let prompt = `Bạn là một đầu bếp thân thiện, chuyên tạo các công thức nấu ăn đơn giản, nhanh chóng và ngon miệng cho đối tượng sinh viên và người trẻ. 

NGUYÊN LIỆU CHÍNH có sẵn: ${ingredients}

YÊU CẦU QUAN TRỌNG (ĐƯỢC NGƯỜI DÙNG CHỌN):
1. Độ khó: ${selectedDifficulty}
   - ${difficultyRequirement}

2. Thời gian nấu: ${selectedTimeRange}
   - ${timeRequirement}
   - BẠN PHẢI đảm bảo thời gian trong kết quả (prepTime, cookTime, totalTime) phù hợp chính xác với yêu cầu này.

3. Số lượng người: ${servingsText}
   - Khẩu phần phải phù hợp chính xác cho ${servingsText}. Tính toán nguyên liệu sao cho đủ cho số người này.

YÊU CẦU KHÁC:
4. Dụng cụ: Chỉ cần dụng cụ cơ bản như chảo, nồi, dao thớt. Tránh các dụng cụ chuyên nghiệp, đắt tiền.
5. Nguyên liệu: Tận dụng tối đa các nguyên liệu đã có. Chỉ thêm các nguyên liệu phổ biến, dễ mua, giá rẻ.
6. Tiết kiệm: Món ăn tiết kiệm chi phí, không lãng phí nguyên liệu.`;

    // Thêm thông tin về chế độ ăn
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

      // Nếu là custom dietary, sử dụng customDietary description
      let dietaryDescription;
      if (dietaryPreferences === 'custom' && customDietary) {
        dietaryDescription = customDietary;
        prompt += `\n7. Chế độ ăn TÙY CHỈNH: Công thức PHẢI tuân thủ nghiêm ngặt chế độ ăn sau (người dùng tự định nghĩa): "${customDietary}". Phân tích kỹ các yêu cầu và đảm bảo công thức phù hợp hoàn toàn.`;
      } else {
        dietaryDescription = dietaryMap[dietaryPreferences] || dietaryPreferences;
        prompt += `\n7. Chế độ ăn: Công thức phải phù hợp với chế độ ăn: ${dietaryDescription}.`;
      }
    }

    // Thêm thông tin về dị ứng
    if (allergies && allergies.length > 0) {
      prompt += `\n\n⚠️ QUAN TRỌNG - DỊ ỨNG: Tuyệt đối KHÔNG sử dụng các nguyên liệu sau vì người dùng bị dị ứng: ${allergies.join(', ')}. Nếu công thức thường dùng các nguyên liệu này, hãy thay thế bằng nguyên liệu an toàn khác.`;
    }

    prompt += `

Hãy trả về kết quả dưới dạng JSON với cấu trúc chính xác như sau (KHÔNG có markdown, chỉ JSON thuần):
{
  "title": "Tên món ăn (hấp dẫn, dễ nhớ)",
  "description": "Mô tả ngắn gọn về món ăn (2-3 câu), nhấn mạnh điểm nổi bật phù hợp cho sinh viên (nhanh, đơn giản, ngon)",
  "difficulty": "Độ khó phải chính xác là '${selectedDifficulty}' (không thay đổi)",
  "prepTime": "Thời gian chuẩn bị (ví dụ: '10 phút') - phải phù hợp với yêu cầu ${selectedTimeRange}",
  "cookTime": "Thời gian nấu (ví dụ: '20 phút') - phải phù hợp với yêu cầu ${selectedTimeRange}",
  "totalTime": "Tổng thời gian (từ chuẩn bị đến hoàn thành) - PHẢI CHÍNH XÁC trong khoảng ${selectedTimeRange}. Ví dụ: nếu chọn '5~10 Phút' thì totalTime phải từ 5-10 phút, nếu chọn '20~30 Phút' thì totalTime phải từ 20-30 phút, nếu chọn 'Hơn 1 Tiếng' thì totalTime phải trên 60 phút",
  "servings": "Số phần ăn phải chính xác là '${servingsText}'",
  "ingredientsList": [
    {
      "name": "Tên nguyên liệu (từ danh sách có sẵn)",
      "amount": "Số lượng (ví dụ: '200g', '2 muỗng canh', '1 quả')",
      "required": true
    }
  ],
  "optionalIngredients": [
    {
      "name": "Tên nguyên liệu tùy chọn (nếu có sẽ ngon hơn nhưng không bắt buộc)",
      "amount": "Số lượng (ví dụ: '1 muỗng cà phê', 'vài lá', 'để thêm vị')",
      "purpose": "Mục đích sử dụng (ví dụ: 'thêm vị đậm đà', 'trang trí', 'tăng độ ngon')",
      "required": false
    }
  ],
  "steps": [
    "Bước 1: Hướng dẫn chi tiết, dễ hiểu, từng bước cụ thể",
    "Bước 2: Mô tả rõ ràng các thao tác",
    ...
  ],
  "tips": "Mẹo nhỏ hữu ích khi nấu món này (ví dụ: cách tiết kiệm thời gian, tiết kiệm gas, bảo quản đồ thừa...)",
  "equipment": "Danh sách dụng cụ cần thiết (chỉ dụng cụ cơ bản, ví dụ: 'Chảo, dao, thớt')"
}

LƯU Ý QUAN TRỌNG:
- Tận dụng TỐI ĐA các nguyên liệu đã có trong danh sách: ${ingredients}
- Nếu cần thêm nguyên liệu phụ (như gia vị cơ bản: muối, đường, nước mắm...), đặt chúng vào "optionalIngredients" với mục đích rõ ràng
- "optionalIngredients" là các nguyên liệu CÓ THỂ thêm để món ăn ngon hơn, đẹp hơn, nhưng KHÔNG BẮT BUỘC - món vẫn có thể hoàn thành chỉ với nguyên liệu chính
- Các bước hướng dẫn phải RẤT CHI TIẾT, dễ hiểu cho người mới bắt đầu
- Nếu có nguyên liệu không phù hợp với chế độ ăn hoặc gây dị ứng, hãy thay thế bằng nguyên liệu phù hợp hoặc đề xuất món ăn khác hoàn toàn`;

    // Gọi Gemini API với retry và fallback model khi quá tải
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
        // Non-retryable -> break
        break;
      }
    }

    // Nếu vẫn lỗi 503, thử model khác
    if (!text && lastErr?.status === 503) {
      try {
        triedModels.push((model && (model.model || model.options?.model)) || '');
      } catch {}
      try {
        model = await getModel(triedModels.filter(Boolean));
        // one more quick retry on alternate model
        text = await tryCall();
      } catch (e2) {
        lastErr = e2;
      }
    }

    if (!text) {
      const message = lastErr?.status === 503
        ? 'Mô hình AI đang quá tải, vui lòng thử lại sau.'
        : (lastErr?.message || 'Không thể tạo công thức');
      return res.status(503).json({ error: message });
    }

    // Parse JSON từ response
    let recipe;
    try {
      // Gemini có thể trả về text có markdown code blocks, cần clean up
      let cleanText = text.trim();

      // Loại bỏ markdown code blocks nếu có
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/```\n?/g, '');
      }

      recipe = JSON.parse(cleanText);
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      console.error('Raw response:', text);
      return res.status(500).json({
        error: 'Failed to parse AI response',
        rawResponse: text
      });
    }

    // Validate recipe structure
    if (!recipe.title || !recipe.ingredientsList || !recipe.steps) {
      return res.status(500).json({
        error: 'Invalid recipe structure from AI',
        recipe
      });
    }

    // Đảm bảo optionalIngredients luôn là array (có thể AI không trả về)
    if (!recipe.optionalIngredients) {
      recipe.optionalIngredients = [];
    }

    // Đảm bảo equipment có giá trị
    if (!recipe.equipment) {
      recipe.equipment = 'Chảo/nồi, dao, thớt (dụng cụ cơ bản)';
    }

    // Đảm bảo difficulty có giá trị
    if (!recipe.difficulty) {
      recipe.difficulty = 'Dễ';
    }

    // Thêm metadata
    recipe.createdAt = new Date().toISOString();
    recipe.userId = userId;
    recipe.sourceIngredients = ingredients;
    recipe.userPreferences = {
      difficulty: selectedDifficulty,
      timeRange: selectedTimeRange,
      servings: selectedServings
    };

    // Lưu lịch sử vào Mongo (isSaved=false)
    try {
      await connectMongoose();
      const doc =         await Recipe.create({ 
          userId, 
          recipe, 
          sourceIngredients: ingredients, 
          sourceType: 'prompt'
        });
      return res.status(200).json({ success: true, recipe, id: doc._id });
    } catch (dbErr) {
      // Nếu lỗi DB, vẫn trả recipe cho FE dùng tạm
      console.error('Failed to save history:', dbErr);
      return res.status(200).json({ success: true, recipe });
    }

  } catch (error) {
    console.error('Error in getRecipe API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;

