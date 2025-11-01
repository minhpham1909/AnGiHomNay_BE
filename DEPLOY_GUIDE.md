# Hướng dẫn Deploy Backend lên Production

## Lựa chọn nền tảng hosting

### 🎯 Khuyến nghị: Railway.app (Dễ nhất)

Railway là nền tảng modern, đơn giản và mạnh mẽ cho Node.js apps.

**Ưu điểm:**
- ✅ Free tier $5/tháng
- ✅ Auto-deploy từ GitHub
- ✅ SSL tự động
- ✅ Environment variables dễ config
- ✅ Logs real-time
- ✅ Cực kỳ dễ dùng

**Nhược điểm:**
- ⚠️ Free tier có giới hạn
- ⚠️ App sleep sau 30 phút không dùng (wake up lâu)

---

## Deploy Backend lên Railway

### Bước 1: Chuẩn bị GitHub Repo

1. **Tạo repo GitHub** (nếu chưa có):
   ```bash
   cd Backend
   git init
   git add .
   git commit -m "Backend ready for deploy"
   git branch -M main
   git remote add origin https://github.com/yourusername/angi-backend.git
   git push -u origin main
   ```

2. **Tạo file `.gitignore`** trong Backend:
   ```
   node_modules/
   .env
   .env.local
   .env.production
   ```

### Bước 2: Setup Railway

1. **Đăng ký Railway:**
   - Vào https://railway.app
   - Sign up với GitHub account

2. **Tạo Project:**
   - Click "New Project"
   - Chọn "Deploy from GitHub repo"
   - Chọn repo Backend của bạn
   - Railway sẽ tự động detect Node.js

3. **Configure Environment Variables:**

   Vào Settings → Variables, thêm:
   
   ```
   MONGODB_URI=your_mongodb_atlas_connection_string
   GEMINI_API_KEY=your_gemini_api_key
   NODE_ENV=production
   PORT=3000 (railway tự set, nhưng thêm để an toàn)
   ```

4. **Deploy:**
   - Railway sẽ tự động build và deploy
   - Đợi 3-5 phút
   - Khi xong, bạn sẽ có URL: `https://your-app.up.railway.app`

### Bước 3: Test Backend

Mở browser, test:
```
https://your-app.up.railway.app/health
```

Kết quả nên là:
```json
{
  "ok": true,
  "message": "Server running",
  "database": "connected"
}
```

✅ **Xong!** Backend đã deploy thành công!

---

## Deploy Backend lên Heroku

### Bước 1: Install Heroku CLI

```bash
npm install -g heroku-cli
```

### Bước 2: Login

```bash
heroku login
```

### Bước 3: Chuẩn bị Files

**Tạo `Procfile`** trong Backend:
```
web: node server.js
```

**Update `package.json`** (thêm engines):
```json
{
  "engines": {
    "node": "18.x",
    "npm": "9.x"
  }
}
```

### Bước 4: Deploy

```bash
cd Backend

# Tạo Heroku app
heroku create angi-backend-app

# Set environment variables
heroku config:set MONGODB_URI="your_mongodb_uri"
heroku config:set GEMINI_API_KEY="your_gemini_key"
heroku config:set NODE_ENV=production

# Deploy
git init
git add .
git commit -m "Deploy backend"
heroku git:remote -a angi-backend-app
git push heroku main
```

### Bước 5: Test

```bash
curl https://angi-backend-app.herokuapp.com/health
```

---

## Deploy Backend lên Render

### Bước 1: Setup Render

1. Vào https://render.com
2. Sign up với GitHub
3. New → Web Service
4. Connect GitHub repo Backend

### Bước 2: Configure

- **Name**: angi-backend
- **Build Command**: `npm install`
- **Start Command**: `node server.js`
- **Instance Type**: Free (cho demo)

### Bước 3: Environment Variables

Vào Environment tab, add:
```
MONGODB_URI=...
GEMINI_API_KEY=...
NODE_ENV=production
```

### Bước 4: Deploy

Click "Create Web Service"
Render sẽ tự động deploy

---

## Kiểm tra CORS Config

Sau khi deploy, **ĐẢM BẢO** backend cho phép requests từ bất kỳ origin nào:

Trong `Backend/server.js`, dòng 22-25:
```javascript
app.use(cors({ 
  origin: '*',  // Cho phép mọi origin
  credentials: true 
}));
```

✅ Đã OK trong code hiện tại!

---

## Setup MongoDB Atlas (Nếu chưa có)

### Bước 1: Tạo Account

1. Vào https://www.mongodb.com/cloud/atlas
2. Sign up free

### Bước 2: Tạo Cluster

1. Build a Database → Free tier (M0)
2. Chọn AWS, region gần nhất
3. Create cluster

### Bước 3: Setup Database User

1. Database Access → Add New Database User
2. Username/Password: tự tạo
3. User Privileges: Read and write to any database

### Bước 4: Network Access

1. Network Access → Add IP Address
2. Click "Allow Access from Anywhere" (hoặc IP của hosting)

### Bước 5: Get Connection String

1. Clusters → Connect → Connect your application
2. Copy connection string:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
3. Thay `<password>` bằng password thật

---

## Test Production Deployment

### Test bằng cURL

```bash
# Health check
curl https://your-backend-url.com/health

# Test create recipe
curl -X POST https://your-backend-url.com/api/recipes \
  -H "Content-Type: application/json" \
  -d '{
    "ingredients": "gà, nấm",
    "userId": "test123"
  }'
```

### Test bằng Postman

1. Import collection: Backend API endpoints
2. Update base URL thành production URL
3. Run tests

---

## Production Checklist

- [ ] MongoDB Atlas đã setup và test OK
- [ ] Gemini API key đã config
- [ ] Backend đã deploy và accessible qua HTTPS
- [ ] CORS đã config đúng
- [ ] Health check endpoint trả về OK
- [ ] Có thể create recipe thành công
- [ ] Photo recipe API hoạt động
- [ ] Environment variables đã set đúng

---

## Troubleshooting

### Backend không start

**Logs Railway:**
```bash
railway logs
```

**Logs Heroku:**
```bash
heroku logs --tail
```

### Database không connect

**Kiểm tra:**
1. MongoDB URI đúng format?
2. IP whitelist trong MongoDB Atlas?
3. Username/password đúng?

### API trả về CORS error

**Fix:**
Backend/server.js phải có:
```javascript
app.use(cors({ origin: '*', credentials: true }));
```

### App crash sau deploy

**Check:**
1. Node version (phải >= 18)
2. Dependencies đã install?
3. Environment variables đã set?

---

## Cost Estimation

| Platform   | Free Tier                    | Pricing                    | Good for |
|------------|------------------------------|----------------------------|----------|
| Railway    | $5/month credit              | $20/month after            | Small apps |
| Heroku     | Sleep after 30min idle       | $7/dyno/month              | Legacy |
| Render     | Sleep after 15min idle       | $7/service/month           | Simple apps |
| Vercel     | Unlimited (Serverless)       | $20/month team             | JAMstack |

**Khuyến nghị cho project này:**
- **Railway**: Tốt nhất cho MVP (free tier tốt)
- **Render**: Backup option

---

## Next Steps

Sau khi backend deploy xong:

1. ✅ Test backend production URL
2. ✅ Update `FrontEnd/app/app.json` với API_URL
3. ✅ Build APK với Expo EAS
4. ✅ Test APK trên thiết bị thật
5. ✅ Release!

---

## Support

Nếu gặp vấn đề, check:
- Railway docs: https://docs.railway.app
- Heroku docs: https://devcenter.heroku.com
- MongoDB Atlas: https://www.mongodb.com/docs/atlas

