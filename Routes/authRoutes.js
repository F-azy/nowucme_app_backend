// routes/authRoutes.js
import express from "express";
import { 
  signup,
  login,
  changePassword,
  changeEmail,
  changeUsername,  // Add this
  deleteAccount,
  verifyOTP,
  resendOTP
} from "../Controllers/authController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.post("/login", login);
router.put("/change-password", authMiddleware, changePassword);
router.put("/change-email", authMiddleware, changeEmail);
router.put("/change-username", authMiddleware, changeUsername);  // Add this
router.delete("/delete-account", authMiddleware, deleteAccount);

export default router;