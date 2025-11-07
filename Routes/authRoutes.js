// routes/authRoutes.js
import express from "express";
import { 
  signup,
  verifyOTP,
  resendOTP,
  login,
  changePassword,
  changeUsername,
  requestEmailChangeOTP,
  verifyEmailChangeOTP,
  requestForgotPasswordOTP,
  resetPasswordWithOTP,
  deleteAccount,
} from "../Controllers/authController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import rateLimit from 'express-rate-limit';

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 mins
  message: 'Too many OTP requests, please try again later',
});


const router = express.Router();

router.post("/signup", signup);
router.post("/verify-otp", verifyOTP);
router.post('/resend-otp', otpLimiter, resendOTP);

router.post("/login", login);

// Password & Email Changes
router.put("/change-password", authMiddleware, changePassword);
router.put("/change-username", authMiddleware, changeUsername);
router.post("/request-email-change-otp", authMiddleware,otpLimiter, requestEmailChangeOTP);
router.post("/verify-email-change-otp", authMiddleware, verifyEmailChangeOTP);

// Forgot Password
router.post("/forgot-password",otpLimiter, requestForgotPasswordOTP);
router.post("/reset-password", resetPasswordWithOTP);

router.delete("/delete-account", authMiddleware, deleteAccount);

export default router;