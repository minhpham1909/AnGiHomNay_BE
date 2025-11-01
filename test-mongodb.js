// Test MongoDB Atlas Connection
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env manually nếu dotenv không hoạt động
try {
  dotenv.config({ path: join(__dirname, '.env') });
} catch (error) {
  console.warn('⚠️  Không tìm thấy file .env, đang thử đọc trực tiếp...');
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
  }
}

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI không tồn tại trong .env file!');
  process.exit(1);
}

async function testMongoDB() {
  let client;
  
  try {
    console.log('🔌 Đang kết nối với MongoDB Atlas...');
    console.log(`📍 URI: ${uri.replace(/\/\/.*:.*@/, '//***:***@')}`); // Ẩn password
    
    client = new MongoClient(uri);
    await client.connect();
    
    console.log('✅ Kết nối thành công!\n');
    
    // Test 1: List databases
    console.log('📋 Test 1: Liệt kê databases...');
    const adminDb = client.db().admin();
    const databases = await adminDb.listDatabases();
    console.log(`✅ Tìm thấy ${databases.databases.length} database(s)`);
    
    // Test 2: Access database
    const dbName = 'angi_hom_nay';
    const db = client.db(dbName);
    console.log(`\n📦 Đang sử dụng database: ${dbName}`);
    
    // Test 3: Access collection users
    const usersCollection = db.collection('users');
    console.log('\n📂 Test 2: Kiểm tra collection "users"...');
    
    // Count documents
    const userCount = await usersCollection.countDocuments();
    console.log(`✅ Collection "users" có ${userCount} document(s)`);
    
    // Test 4: Insert test document
    console.log('\n📝 Test 3: Insert test document...');
    const testUserId = `test_user_${Date.now()}`;
    const testUser = {
      userId: testUserId,
      dietaryPreferences: 'vegetarian',
      allergies: ['đậu phộng'],
      createdAt: new Date(),
      test: true
    };
    
    const insertResult = await usersCollection.insertOne(testUser);
    console.log(`✅ Đã insert document với _id: ${insertResult.insertedId}`);
    
    // Test 5: Find document
    console.log('\n🔍 Test 4: Tìm document vừa insert...');
    const foundUser = await usersCollection.findOne({ userId: testUserId });
    if (foundUser) {
      console.log('✅ Tìm thấy document:');
      console.log(JSON.stringify(foundUser, null, 2));
    } else {
      console.log('❌ Không tìm thấy document');
    }
    
    // Test 6: Update document
    console.log('\n✏️  Test 5: Update document...');
    const updateResult = await usersCollection.updateOne(
      { userId: testUserId },
      { $set: { dietaryPreferences: 'vegan', updatedAt: new Date() } }
    );
    console.log(`✅ Đã update ${updateResult.modifiedCount} document(s)`);
    
    // Verify update
    const updatedUser = await usersCollection.findOne({ userId: testUserId });
    console.log(`✅ Dietary preference mới: ${updatedUser.dietaryPreferences}`);
    
    // Test 7: Delete test document (cleanup)
    console.log('\n🗑️  Test 6: Xóa test document (cleanup)...');
    const deleteResult = await usersCollection.deleteOne({ userId: testUserId });
    console.log(`✅ Đã xóa ${deleteResult.deletedCount} document(s)`);
    
    // Test 8: Test getUserProfile function logic
    console.log('\n🧪 Test 7: Test getUserProfile logic...');
    const testUserId2 = `test_user_${Date.now()}`;
    
    // Simulate getUserProfile
    let user = await usersCollection.findOne({ userId: testUserId2 });
    if (!user) {
      const defaultProfile = {
        userId: testUserId2,
        dietaryPreferences: 'default',
        allergies: []
      };
      await usersCollection.insertOne(defaultProfile);
      user = defaultProfile;
      console.log('✅ Tạo default profile mới');
    }
    console.log(`✅ User profile: ${JSON.stringify(user, null, 2)}`);
    
    // Cleanup
    await usersCollection.deleteOne({ userId: testUserId2 });
    console.log('✅ Đã cleanup test user 2');
    
    // Test 9: Test savedRecipes collection
    console.log('\n📚 Test 8: Kiểm tra collection "savedRecipes"...');
    const savedRecipesCollection = db.collection('savedRecipes');
    const recipeCount = await savedRecipesCollection.countDocuments();
    console.log(`✅ Collection "savedRecipes" có ${recipeCount} document(s)`);
    
    console.log('\n🎉 TẤT CẢ TEST ĐỀU THÀNH CÔNG!');
    console.log('✅ MongoDB Atlas connection hoạt động ổn định!');
    
  } catch (error) {
    console.error('\n❌ LỖI:', error.message);
    console.error('Chi tiết:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Đã đóng kết nối MongoDB');
    }
  }
}

// Run test
testMongoDB();

