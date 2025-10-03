import express from "express";
import { updateUserProfile } from "../Controllers/profileController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.put("/", authMiddleware, updateUserProfile);

export default router;
