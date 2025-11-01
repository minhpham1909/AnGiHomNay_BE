import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import 'dotenv/config'; // Đọc .env file
import { testConnection } from './lib/mongodb.js';
import getRecipeRouter from './api/getRecipe.js';
import usersRouter from './api/users.js';
import recipesRouter from './api/recipes.js';
import { connectMongoose } from './lib/mongoose.js';
import loginRouter from './api/auth/login.js';
import registerRouter from './api/auth/register.js';
import forgotPasswordRouter from './api/auth/forgot-password.js';
import resetPasswordRouter from './api/auth/reset-password.js';
import userProfileRouter from './api/userProfile.js';
import shoppingListRouter from './api/shoppingList.js';
import photoRecipeRouter from './api/photoRecipe.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({ 
  origin: '*', // Trong production nên giới hạn origin
  credentials: true 
}));
app.use(express.json({ limit: '10mb' })); // Tăng limit cho AI responses
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check route
app.get('/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({ 
    ok: true, 
    message: 'Server running',
    database: dbStatus ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/recipes', getRecipeRouter);
app.use('/api/users', usersRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/auth/login', loginRouter);
app.use('/api/auth/register', registerRouter);
app.use('/api/auth/forgot-password', forgotPasswordRouter);
app.use('/api/auth/reset-password', resetPasswordRouter);
app.use('/api/user/profile', userProfileRouter);
app.use('/api/shopping-list', shoppingListRouter);
app.use('/api/photo-recipe', photoRecipeRouter);

// Các routes cho recipes đã được xử lý bởi recipesRouter

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'AnGiHomNay API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      recipes: '/api/recipes'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🔥 Unexpected error:', err);
  res.status(err.status || 500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Test MongoDB connection before starting server
async function startServer() {
  try {
    // Connect Mongoose
    let dbConnected = false;
    try {
      await connectMongoose();
      dbConnected = true;
    } catch (e) {
      console.error('❌ Mongoose connect failed:', e.message);
    }
    if (!dbConnected) {
      console.error('❌ MongoDB connection failed. Server will still start but database operations may fail.');
    }

    // Start Express server
    app.listen(PORT, () => {
      // Display server URL dynamically
      const serverUrl = process.env.RAILWAY_PUBLIC_DOMAIN 
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : process.env.PORT 
          ? `http://localhost:${PORT}`
          : `http://localhost:3000`;
      
      console.log(`🚀 Server ready at ${serverUrl}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  MongoDB: ${dbConnected ? '✅ Connected' : '❌ Disconnected'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start server
startServer();
