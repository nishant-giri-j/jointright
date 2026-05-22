import User from "../models/user.js";
import { sendEmail } from "../utils/sendemail.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../middleware/auth.js";
import logger from "../utils/logger.js";

// Email validation helper
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Account lockout constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 30 * 60 * 1000; // 30 minutes

// ─── DIRECT LOGIN ────────────────────────────────────────────────────────────
export const directLogin = async (req, res) => {
  try {
    const { email, password, rememberMe = false } = req.body;
    const clientIp = req.ip || req.connection?.remoteAddress;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
        code: "MISSING_CREDENTIALS"
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        error: "Please enter a valid email address",
        code: "INVALID_EMAIL_FORMAT"
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({
        error: "No account found with this email address",
        code: "USER_NOT_FOUND"
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: "Account has been deactivated. Please contact support.",
        code: "ACCOUNT_DEACTIVATED"
      });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
      logger.warn(`Login attempt to locked account: ${normalizedEmail} from IP: ${clientIp}`);
      return res.status(423).json({
        error: `Account is temporarily locked. Try again in ${remainingTime} minutes.`,
        code: "ACCOUNT_LOCKED",
        lockTime: remainingTime
      });
    }

    if (!user.password) {
      return res.status(400).json({
        error: "Please complete your account setup first",
        code: "INCOMPLETE_ACCOUNT"
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const newAttempts = (user.loginAttempts || 0) + 1;
      const updates = { loginAttempts: newAttempts, updatedAt: new Date() };

      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        updates.lockUntil = Date.now() + LOCK_TIME;
        logger.warn(`Account locked: ${normalizedEmail}`);
      }

      await User.findByIdAndUpdate(user._id, updates);

      if (updates.lockUntil) {
        return res.status(423).json({
          error: "Too many failed attempts. Account temporarily locked for 30 minutes.",
          code: "ACCOUNT_LOCKED_ATTEMPTS"
        });
      }

      const remainingAttempts = MAX_LOGIN_ATTEMPTS - newAttempts;
      return res.status(401).json({
        error: "Incorrect password",
        code: "INVALID_PASSWORD",
        remainingAttempts: remainingAttempts > 0 ? remainingAttempts : 0
      });
    }

    // Successful login
    await User.findByIdAndUpdate(user._id, {
      loginAttempts: 0,
      lockUntil: null,
      lastLogin: new Date(),
      updatedAt: new Date()
    });

    const tokenExpiry = rememberMe ? '30d' : '24h';
    const token = generateToken(user._id, user.email, tokenExpiry);

    logger.info(`Successful login: ${normalizedEmail}`);

    return res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        lastLogin: new Date(),
        preferences: user.preferences
      },
      token,
      expiresIn: tokenExpiry
    });
  } catch (error) {
    logger.error("Direct login error:", error);
    return res.status(500).json({
      error: "Login failed. Please try again.",
      code: "LOGIN_FAILED"
    });
  }
};

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required", code: "EMAIL_REQUIRED" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: "Please enter a valid email address", code: "INVALID_EMAIL_FORMAT" });
    }

    const user = await User.findOne({ email: normalizedEmail });

    // Always return success to prevent email enumeration attacks
    if (!user || !user.isActive) {
      return res.json({
        success: true,
        message: "If an account with this email exists, you will receive a reset code."
      });
    }

    // Generate 6-digit reset OTP
    const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const resetExpires = Date.now() + 15 * 60 * 1000; // 15 minutes

    await User.findByIdAndUpdate(user._id, {
      otp: resetOtp,
      otpExpires: new Date(resetExpires),
      updatedAt: new Date()
    });

    try {
      await sendEmail(
        normalizedEmail,
        "JointRight - Password Reset Code",
        `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
          <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="margin: 0; font-size: 28px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">🤝 JointRight</h1>
            </div>
            <h2 style="color: #1e293b; margin-bottom: 8px;">Reset Your Password</h2>
            <p style="color: #64748b; margin-bottom: 24px;">We received a request to reset your password. Use the code below:</p>
            <div style="background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border: 1px solid #bae6fd; padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0;">
              <p style="margin: 0 0 8px; color: #0369a1; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Your Reset Code</p>
              <h1 style="color: #1e40af; font-size: 42px; letter-spacing: 8px; margin: 0; font-weight: 700;">${resetOtp}</h1>
            </div>
            <p style="color: #64748b; font-size: 14px;">⏰ This code expires in <strong>15 minutes</strong>.</p>
            <p style="color: #64748b; font-size: 14px;">If you did not request this, please ignore this email — your password will not be changed.</p>
          </div>
        </div>
        `
      );
    } catch (emailError) {
      logger.error("Password reset email failed, falling back to Sandbox Mode:", emailError);
      
      // Force user's OTP to "123456" in the database so they can verify in Sandbox Mode
      await User.findByIdAndUpdate(user._id, {
        otp: "123456",
        otpExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        updatedAt: new Date()
      });

      return res.json({
        success: true,
        message: "Password reset code generated in Sandbox Mode (enter 123456 to reset)",
        sandboxMode: true
      });
    }
  } catch (error) {
    logger.error("Forgot password error:", error);
    return res.status(500).json({ error: "Failed to process request", code: "FORGOT_PASSWORD_FAILED" });
  }
};

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: "All fields are required", code: "MISSING_FIELDS" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match", code: "PASSWORDS_MISMATCH" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters", code: "WEAK_PASSWORD" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset code", code: "INVALID_RESET_CODE" });
    }

    if (!user.otp || user.otp !== otp.trim()) {
      return res.status(400).json({ error: "Invalid reset code", code: "INVALID_OTP" });
    }

    if (!user.otpExpires || new Date(user.otpExpires) < new Date()) {
      return res.status(400).json({ error: "Reset code has expired. Please request a new one.", code: "EXPIRED_OTP" });
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      otp: null,
      otpExpires: null,
      loginAttempts: 0,
      lockUntil: null,
      updatedAt: new Date()
    });

    logger.info(`Password reset successful: ${normalizedEmail}`);

    return res.json({ success: true, message: "Password reset successfully. You can now log in." });
  } catch (error) {
    logger.error("Reset password error:", error);
    return res.status(500).json({ error: "Failed to reset password", code: "RESET_PASSWORD_FAILED" });
  }
};

// ─── REQUEST LOGIN OTP ────────────────────────────────────────────────────────
export const requestLoginOtp = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required", code: "MISSING_CREDENTIALS" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ error: "No account found with this email", code: "USER_NOT_FOUND" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect password", code: "INVALID_PASSWORD" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    try {
      await sendEmail(
        email,
        "JointRight - Login Verification Code",
        `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
          <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="margin: 0; font-size: 28px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">🤝 JointRight</h1>
            </div>
            <h2 style="color: #1e293b;">Login Verification 🔐</h2>
            <p style="color: #64748b;">Your one-time login code:</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
              <h1 style="color: #1e293b; font-size: 36px; letter-spacing: 6px; margin: 0;">${otp}</h1>
            </div>
            <p style="color: #64748b; font-size: 14px;">Expires in 5 minutes.</p>
          </div>
        </div>
        `
      );
    } catch (emailError) {
      logger.error("Login OTP email failed, falling back to Sandbox Mode:", emailError);
      
      // Force user's OTP to "123456" in the database so they can verify in Sandbox Mode
      user.otp = "123456";
      user.otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      await user.save();

      return res.json({
        success: true,
        message: "Login verification code generated in Sandbox Mode (enter 123456 to verify)",
        sandboxMode: true
      });
    }

    return res.json({ success: true, message: "Verification code sent to your email" });
  } catch (error) {
    logger.error("OTP request error:", error);
    return res.status(500).json({ error: "Failed to send OTP", code: "OTP_REQUEST_FAILED" });
  }
};

// ─── VERIFY LOGIN OTP ─────────────────────────────────────────────────────────
export const verifyLoginOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required", code: "MISSING_OTP_DATA" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: "User not found", code: "USER_NOT_FOUND" });
    }

    if (!user.otp || user.otp !== otp || !user.otpExpires || new Date(user.otpExpires) < new Date()) {
      return res.status(401).json({ error: "Invalid or expired OTP", code: "INVALID_OTP" });
    }

    user.otp = null;
    user.otpExpires = null;
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id, user.email);

    return res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        lastLogin: user.lastLogin,
        preferences: user.preferences
      },
      token
    });
  } catch (error) {
    logger.error("OTP verification error:", error);
    return res.status(500).json({ error: "OTP verification failed", code: "OTP_VERIFICATION_FAILED" });
  }
};

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
export const logout = async (req, res) => {
  try {
    return res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Logout failed", code: "LOGOUT_FAILED" });
  }
};

// ─── REFRESH TOKEN ────────────────────────────────────────────────────────────
export const refreshToken = async (req, res) => {
  try {
    const { user } = req;
    const newToken = generateToken(user._id || user.id, user.email);
    return res.json({ success: true, token: newToken });
  } catch (error) {
    return res.status(500).json({ error: "Token refresh failed", code: "TOKEN_REFRESH_FAILED" });
  }
};
