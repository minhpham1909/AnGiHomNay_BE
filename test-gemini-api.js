// Test Gemini AI API Endpoint
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getUserProfile } from './lib/db.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  dotenv.config({ path: join(__dirname, '.env') });
} catch (error) {
  try {
    const envContent = readFileSync(join(__dirname, '.env'), 'utf-8');
    envContent.split('\n').forEach(line => {
      const [key, ...values] = line.split('=');
      if (key && values.length > 0) {
        process.env[key.trim()] = values.join('=').trim();
      }
    });
  } catch (err) {
    console.error('❌ Không thể đọc file .env');
    process.exit(1);
  }
}

// Simulate API request
async function testGetRecipeAPI() {
  try {
    console.log('🧪 Test Gemini AI API Endpoint\n');
    console.log('='.repeat(60));

    // Test data
    const testIngredients = 'gà, nấm, hành tây, kem tươi';
    const testUserId = `test_user_${Date.now()}`;

    console.log(`📝 Test ingredients: ${testIngredients}`);
    console.log(`👤 Test userId: ${testUserId}\n`);

    // Step 1: Get user profile (tự động tạo nếu chưa có)
    console.log('📋 Step 1: Lấy user profile...');
    const userProfile = await getUserProfile(testUserId);
    console.log(`✅ User profile:`);
    console.log(`   - Dietary preferences: ${userProfile.dietaryPreferences}`);
    console.log(`   - Allergies: ${userProfile.allergies.length > 0 ? userProfile.allergies.join(', ') : 'Không có'}\n`);

    // Step 2: Check Gemini API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      console.error('❌ GEMINI_API_KEY chưa được cấu hình trong file .env!');
      console.error('   Hãy lấy API key tại: https://aistudio.google.com/app/apikey');
      process.exit(1);
    }
    console.log('🔑 Step 2: Kiểm tra Gemini API Key...');
    console.log(`✅ API Key đã được cấu hình (${apiKey.substring(0, 10)}...)\n`);

    // Step 3: Initialize Gemini AI
    console.log('🤖 Step 3: Khởi tạo Gemini AI...');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }); 
    console.log('✅ Gemini AI đã được khởi tạo\n');

    // Step 4: Build prompt (giống như trong getRecipe.js)
    console.log('📝 Step 4: Xây dựng prompt...');
    const { dietaryPreferences, allergies } = userProfile;

    let prompt = `Bạn là một đầu bếp thân thiện, chuyên tạo các công thức nấu ăn đơn giản, nhanh chóng và ngon miệng cho đối tượng sinh viên và người trẻ. 

NGUYÊN LIỆU CHÍNH có sẵn: ${testIngredients}

YÊU CẦU QUAN TRỌNG cho đối tượng sinh viên/người trẻ:
1. Thời gian nấu: Ưu tiên món ăn có tổng thời gian (từ chuẩn bị đến hoàn thành) dưới 30-45 phút. Món càng nhanh càng tốt.
2. Độ khó: Rất đơn giản, dễ làm, không cần kỹ thuật phức tạp. Phù hợp với người mới bắt đầu nấu ăn.
3. Dụng cụ: Chỉ cần dụng cụ cơ bản như chảo, nồi, dao thớt. Tránh các dụng cụ chuyên nghiệp, đắt tiền.
4. Nguyên liệu: Tận dụng tối đa các nguyên liệu đã có. Chỉ thêm các nguyên liệu phổ biến, dễ mua, giá rẻ.
5. Khẩu phần: Phù hợp cho 1-2 người (sinh viên thường nấu cho mình hoặc bạn cùng phòng).
6. Tiết kiệm: Món ăn tiết kiệm chi phí, không lãng phí nguyên liệu.`;

    if (dietaryPreferences && dietaryPreferences !== 'default') {
      const dietaryMap = {
        'vegetarian': 'ăn chay (không thịt, chỉ rau củ và các sản phẩm từ sữa/trứng)',
        'vegan': 'thuần chay (không có bất kỳ sản phẩm động vật nào)',
        'keto': 'ăn kiêng Keto (ít carb, nhiều chất béo)',
        'paleo': 'ăn kiêng Paleo (thực phẩm tự nhiên, không chế biến)',
        'halal': 'theo chế độ Halal',
        'kosher': 'theo chế độ Kosher'
      };
      const dietaryDescription = dietaryMap[dietaryPreferences] || dietaryPreferences;
      prompt += `\n7. Chế độ ăn: Công thức phải phù hợp với chế độ ăn: ${dietaryDescription}.`;
    }

    if (allergies && allergies.length > 0) {
      prompt += `\n\n⚠️ QUAN TRỌNG - DỊ ỨNG: Tuyệt đối KHÔNG sử dụng các nguyên liệu sau vì người dùng bị dị ứng: ${allergies.join(', ')}. Nếu công thức thường dùng các nguyên liệu này, hãy thay thế bằng nguyên liệu an toàn khác.`;
    }

    prompt += `

Hãy trả về kết quả dưới dạng JSON với cấu trúc chính xác như sau (KHÔNG có markdown, chỉ JSON thuần):
{
  "title": "Tên món ăn (hấp dẫn, dễ nhớ)",
  "description": "Mô tả ngắn gọn về món ăn (2-3 câu), nhấn mạnh điểm nổi bật phù hợp cho sinh viên (nhanh, đơn giản, ngon)",
  "difficulty": "Độ khó: 'Dễ' hoặc 'Trung bình' (luôn ưu tiên 'Dễ')",
  "prepTime": "Thời gian chuẩn bị (ví dụ: '10 phút')",
  "cookTime": "Thời gian nấu (ví dụ: '20 phút')",
  "totalTime": "Tổng thời gian (ví dụ: '30 phút') - phải dưới 45 phút",
  "servings": "Số phần ăn (ví dụ: '1-2 người')",
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
- Tận dụng TỐI ĐA các nguyên liệu đã có trong danh sách: ${testIngredients}
- Nếu cần thêm nguyên liệu phụ (như gia vị cơ bản: muối, đường, nước mắm...), đặt chúng vào "optionalIngredients" với mục đích rõ ràng
- "optionalIngredients" là các nguyên liệu CÓ THỂ thêm để món ăn ngon hơn, đẹp hơn, nhưng KHÔNG BẮT BUỘC - món vẫn có thể hoàn thành chỉ với nguyên liệu chính
- Các bước hướng dẫn phải RẤT CHI TIẾT, dễ hiểu cho người mới bắt đầu
- Nếu có nguyên liệu không phù hợp với chế độ ăn hoặc gây dị ứng, hãy thay thế bằng nguyên liệu phù hợp hoặc đề xuất món ăn khác hoàn toàn`;

    console.log('✅ Prompt đã được xây dựng\n');
    console.log('📤 Độ dài prompt:', prompt.length, 'ký tự\n');

    // Step 5: Call Gemini API
    console.log('🚀 Step 5: Gọi Gemini API (có thể mất vài giây)...');
    console.log('⏳ Đang xử lý...\n');

    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const endTime = Date.now();

    console.log(`✅ Nhận được response từ Gemini (${endTime - startTime}ms)\n`);

    // Step 6: Parse JSON response
    console.log('📦 Step 6: Parse JSON response...');
    let recipe;
    try {
      let cleanText = text.trim();

      // Loại bỏ markdown code blocks nếu có
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/```\n?/g, '');
      }

      recipe = JSON.parse(cleanText);
      console.log('✅ Parse JSON thành công!\n');
    } catch (parseError) {
      console.error('❌ Lỗi khi parse JSON:', parseError.message);
      console.error('\n📄 Raw response từ Gemini:');
      console.log(text);
      process.exit(1);
    }

    // Step 7: Validate và hiển thị kết quả
    console.log('✅ Step 7: Validate recipe structure...');

    if (!recipe.title || !recipe.ingredientsList || !recipe.steps) {
      console.error('❌ Recipe structure không hợp lệ!');
      console.error('Missing fields:', {
        title: !recipe.title,
        ingredientsList: !recipe.ingredientsList,
        steps: !recipe.steps
      });
      process.exit(1);
    }

    // Đảm bảo optionalIngredients là array
    if (!recipe.optionalIngredients) {
      recipe.optionalIngredients = [];
    }
    if (!recipe.equipment) {
      recipe.equipment = 'Chảo/nồi, dao, thớt (dụng cụ cơ bản)';
    }
    if (!recipe.difficulty) {
      recipe.difficulty = 'Dễ';
    }

    console.log('✅ Recipe structure hợp lệ!\n');
    console.log('='.repeat(60));
    console.log('🎉 KẾT QUẢ CÔNG THỨC TỪ AI:\n');
    console.log(`🍳 Tên món: ${recipe.title}`);
    console.log(`📝 Mô tả: ${recipe.description}`);
    console.log(`⏱️  Thời gian: ${recipe.totalTime}`);
    console.log(`👥 Khẩu phần: ${recipe.servings}`);
    console.log(`📊 Độ khó: ${recipe.difficulty}`);
    console.log(`🔧 Dụng cụ: ${recipe.equipment}\n`);

    console.log('📋 Nguyên liệu bắt buộc:');
    recipe.ingredientsList.forEach((ing, idx) => {
      console.log(`   ${idx + 1}. ${ing.name} - ${ing.amount}`);
    });

    if (recipe.optionalIngredients && recipe.optionalIngredients.length > 0) {
      console.log('\n✨ Nguyên liệu tùy chọn:');
      recipe.optionalIngredients.forEach((ing, idx) => {
        console.log(`   ${idx + 1}. ${ing.name} - ${ing.amount}`);
        console.log(`      (${ing.purpose})`);
      });
    }

    console.log('\n👨‍🍳 Các bước thực hiện:');
    recipe.steps.forEach((step, idx) => {
      console.log(`   ${idx + 1}. ${step}`);
    });

    if (recipe.tips) {
      console.log(`\n💡 Mẹo nhỏ: ${recipe.tips}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 TEST THÀNH CÔNG!');
    console.log('✅ Gemini AI API hoạt động tốt!');
    console.log('✅ Recipe được tạo thành công với format đúng!');

    // Cleanup test user
    const { getCollection } = await import('./lib/db.js');
    const usersCollection = await getCollection('users');
    await usersCollection.deleteOne({ userId: testUserId });
    console.log('\n🧹 Đã cleanup test user');

  } catch (error) {
    console.error('\n❌ LỖI:', error.message);
    if (error.stack) {
      console.error('\n📚 Stack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run test
testGetRecipeAPI();

