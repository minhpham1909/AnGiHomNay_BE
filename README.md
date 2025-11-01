<<<<<<< HEAD
# Backend API - Ăn gì hôm nay

Backend server sử dụng **Express.js** + **Node.js** cho ứng dụng AnGiHomNay.

## Setup

### 1. Cài đặt dependencies
```bash
cd Backend
npm install
```

### 2. Cấu hình Environment Variables

Tạo file `.env` trong thư mục `Backend/` (copy từ `env.example`):

```env
# MongoDB Atlas Connection String
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=Cluster0

# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Specify Gemini Model
GEMINI_MODEL=gemini-2.5-flash

# Server Configuration
PORT=3000
NODE_ENV=development
```

**Lưu ý:** Bạn cần lấy Google Gemini API Key tại: https://aistudio.google.com/app/apikey

### 3. Chạy server

**Development mode (với auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

Server sẽ chạy tại: `http://localhost:3000`

### 4. Kiểm tra server

Test health endpoint:
```bash
curl http://localhost:3000/health
```

Hoặc mở trình duyệt: `http://localhost:3000`

## API Endpoints

### Health Check

**GET** `/health`
- Kiểm tra trạng thái server và database connection
- Response:
```json
{
  "ok": true,
  "message": "Server running",
  "database": "connected",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Generate Recipe

**POST** `/api/recipes`
- Tạo công thức nấu ăn từ danh sách nguyên liệu sử dụng AI (Gemini)

**Request Body:**
```json
{
  "ingredients": "gà, nấm, kem tươi, hành tây",
  "userId": "user123"
}
```

**Response:**
```json
{
  "success": true,
  "recipe": {
    "title": "Gà sốt kem nấm",
    "description": "Món ăn nhanh, đơn giản, phù hợp cho sinh viên...",
    "difficulty": "Dễ",
    "prepTime": "10 phút",
    "cookTime": "20 phút",
    "totalTime": "30 phút",
    "servings": "1-2 người",
    "ingredientsList": [
      {
        "name": "Thịt gà",
        "amount": "200g",
        "required": true
      }
    ],
    "optionalIngredients": [
      {
        "name": "Hành lá",
        "amount": "vài nhánh",
        "purpose": "thêm vị đậm đà",
        "required": false
      }
    ],
    "steps": [
      "Bước 1: ...",
      "Bước 2: ..."
    ],
    "tips": "Mẹo nhỏ hữu ích...",
    "equipment": "Chảo, dao, thớt",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "userId": "user123",
    "sourceIngredients": "gà, nấm, kem tươi"
  }
}
```

## Kiến trúc

- **Framework**: Express.js (Node.js)
- **Database**: MongoDB Atlas với connection pooling
- **AI Service**: Google Gemini API (auto-select best available model)
- **Authentication**: (Chưa implement - sẽ thêm Clerk trong tương lai)

## Project Structure

```
Backend/
├── api/              # API route handlers
│   └── getRecipe.js   # Recipe generation endpoint
├── lib/               # Helper libraries
│   ├── mongodb.js     # MongoDB connection & pooling
│   └── db.js          # Database helper functions
├── config/            # Configuration files
│   └── gemini.js      # Gemini AI model configuration
├── server.js          # Express server entry point
├── package.json
└── env.example        # Environment variables template
```

## Development

### Test MongoDB Connection
```bash
npm run test:mongodb
```

### Test Gemini API
```bash
npm run test:gemini
```

## Database Structure

### Collection: `users`
```json
{
  "userId": "user_123",
  "dietaryPreferences": "default", // default, vegetarian, vegan, keto, diet, gym, etc.
  "allergies": ["đậu phộng", "hải sản"]
}
```

## Notes

- Server sử dụng connection pooling cho MongoDB để tối ưu hiệu suất
- Gemini model sẽ tự động chọn model tốt nhất có sẵn trong API key của bạn
- CORS được cấu hình để cho phép tất cả origins (nên giới hạn trong production)
- Express server hỗ trợ JSON body parsing với limit 10MB cho AI responses
=======
