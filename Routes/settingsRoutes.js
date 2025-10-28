// routes/settingsRoutes.js
import express from "express";
import { getUserSettings, updateUserSettings } from "../Controllers/settingsController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getUserSettings);
router.put("/", authMiddleware, updateUserSettings);

export default router;