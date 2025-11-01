import { MongoClient } from 'mongodb';
import 'dotenv/config';

// MongoDB connection string từ environment variable
const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise;

if (!uri) {
  throw new Error('Please add your Mongo URI to .env file');
}

// Connection pooling cho Express server
// Trong Express, chúng ta nên tái sử dụng connection để tối ưu hiệu suất
let globalWithMongo = global;
if (!globalWithMongo._mongoClientPromise) {
  client = new MongoClient(uri, options);
  globalWithMongo._mongoClientPromise = client.connect();
  console.log('✅ MongoDB connection established');
}
clientPromise = globalWithMongo._mongoClientPromise;

// Helper function để test connection
export async function testConnection() {
  try {
    const client = await clientPromise;
    await client.db('admin').command({ ping: 1 });
    console.log('✅ MongoDB ping successful');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection test failed:', error);
    return false;
  }
}

export default clientPromise;

