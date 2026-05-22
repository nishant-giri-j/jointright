import express from "express";
import {
  requestLoginOtp,
  verifyLoginOtp,
  directLogin,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword
} from "../controllers/logincontroller.js";
import { rateLimit, authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Rate limiters
const loginRateLimit    = rateLimit(10, 15 * 60 * 1000); // 10/15min
const otpRateLimit      = rateLimit(5,  15 * 60 * 1000); // 5/15min
const forgotRateLimit   = rateLimit(3,  15 * 60 * 1000); // 3/15min (stricter)

// Direct email+password login
router.post("/",        loginRateLimit, directLogin);
router.post("/direct",  loginRateLimit, directLogin);

// OTP-based login
router.post("/request-otp", otpRateLimit,   requestLoginOtp);
router.post("/verify",      loginRateLimit, verifyLoginOtp);

// Forgot / reset password
router.post("/forgot-password", forgotRateLimit, forgotPassword);
router.post("/reset-password",  loginRateLimit,  resetPassword);

// Authenticated actions
router.post("/logout",  authenticateToken, logout);
router.post("/refresh", authenticateToken, refreshToken);

export default router;
