import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  phone: { type: String },
  bio: { type: String, maxlength: 500 },
  company: { type: String },
  position: { type: String },
  profilePicture: { type: String },
  role: { type: String, enum: ['user', 'admin', 'moderator'], default: 'user' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  otp: { type: String },
  otpExpires: { type: Date },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  emailVerified: { type: Boolean, default: false },
  twoFactorEnabled: { type: Boolean, default: false },
  preferences: {
    notifications: { type: Boolean, default: true },
    emailUpdates: { type: Boolean, default: true },
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    language: { type: String, default: 'en' }
  },
  // Reference to cyber score (populated when needed)
  cyberScore: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CyberScore'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deactivatedAt: { type: Date }
});

// Password hashing middleware
userSchema.pre('save', async function(next) {
  // Skip if password not modified
  if (!this.isModified('password') || !this.password) return next();
  // Skip if already a bcrypt hash (starts with $2a$ or $2b$)
  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) return next();

  try {
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.firstName || this.email?.split('@')[0] || 'User';
});

// Virtual for isVerified (using emailVerified field)
userSchema.virtual('isVerified').get(function() {
  return this.emailVerified;
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

export default mongoose.models.User || mongoose.model("User", userSchema);
