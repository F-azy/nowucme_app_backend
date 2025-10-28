// routes/authRoutes.js
import express from "express";
import { 
  signup,
  login,
  changePassword,
  changeEmail,
  deleteAccount
} from "../Controllers/authController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.put("/change-password", authMiddleware, changePassword);
router.put("/change-email", authMiddleware, changeEmail);
router.delete("/delete-account", authMiddleware, deleteAccount);

export default router;