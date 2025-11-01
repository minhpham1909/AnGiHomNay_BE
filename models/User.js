import mongoose from '../lib/mongoose.js';

const userSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true, unique: true },
    email: { type: String, index: true },
    passwordHash: { type: String },
    name: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    gender: { type: String, enum: ['', 'male', 'female', 'other'], default: '' },
    dateOfBirth: { type: String, default: '' },
    dietaryPreferences: { type: String, default: 'default' },
    customDietary: { type: mongoose.Schema.Types.Mixed, default: null },
    allergies: { type: [String], default: [] },
    lastLoginAt: { type: Date },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

export default mongoose.models.User || mongoose.model('User', userSchema);


