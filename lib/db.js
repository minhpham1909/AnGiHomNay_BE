import clientPromise from './mongodb.js';

const DB_NAME = 'angi_hom_nay'; // Tên database

// Helper function để lấy database instance
export async function getDatabase() {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

// Helper function để lấy collection
export async function getCollection(collectionName) {
  const db = await getDatabase();
  return db.collection(collectionName);
}

// Helper function để lấy user profile
export async function getUserProfile(userId) {
  const usersCollection = await getCollection('users');
  const user = await usersCollection.findOne({ userId });

  if (!user) {
    const defaultProfile = {
      userId,
      name: '',
      email: '',
      avatarUrl: '',
      gender: '',
      dateOfBirth: '',
      dietaryPreferences: 'default',
      customDietary: null,
      allergies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await usersCollection.insertOne(defaultProfile);
    return defaultProfile;
  }
  return user;
}

// Helper function để update user profile
export async function updateUserProfile(userId, profileData) {
  const usersCollection = await getCollection('users');
  const updateResult = await usersCollection.updateOne(
    { userId },
    {
      $set: {
        ...profileData,
        updatedAt: new Date().toISOString()
      }
    },
    { upsert: true }
  );
  return updateResult;
}

// --- Recipes helpers ---
export async function saveRecipe(userId, recipe) {
  const recipesColl = await getCollection('recipes');
  const doc = { userId, recipe, createdAt: new Date().toISOString() };
  const result = await recipesColl.insertOne(doc);
  return result.insertedId;
}

export async function getRecipesByUser(userId) {
  const recipesColl = await getCollection('recipes');
  return await recipesColl.find({ userId }).toArray();
}

export async function deleteRecipe(userId, recipeId) {
  const recipesColl = await getCollection('recipes');
  const { ObjectId } = (await import('mongodb'));
  const result = await recipesColl.deleteOne({ _id: new ObjectId(recipeId), userId });
  return result.deletedCount === 1;
}

