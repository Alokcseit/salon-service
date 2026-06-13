import express from "express";
import {
  registerDeviceToken,
  unregisterDeviceToken,
} from "../controllers/deviceTokenController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register-device", protect, registerDeviceToken);
router.delete("/unregister-device", protect, unregisterDeviceToken);

export default router;
