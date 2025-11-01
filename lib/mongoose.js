import mongoose from 'mongoose';

let isConnected = false;

export async function connectMongoose() {
  if (isConnected) return mongoose.connection;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    // modern driver options handled by mongoose
    dbName: process.env.MONGODB_DB || 'angi_hom_nay',
  });
  isConnected = true;
  return mongoose.connection;
}

export default mongoose;


