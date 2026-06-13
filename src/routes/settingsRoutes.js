import express from "express";
import {
  getSchedule,
  setHoliday,
  removeHoliday,
  setOfflineSlots,
  resetSettings,
} from "../controllers/settingsController.js";
import { geocodeAddress } from "../controllers/geocodeController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/schedule", protect, authorize("salon"), getSchedule);
router.post("/holiday", protect, authorize("salon"), setHoliday);
router.delete("/holiday", protect, authorize("salon"), removeHoliday);
router.put("/offline-slots", protect, authorize("salon"), setOfflineSlots);
router.delete("/settings/reset", protect, authorize("salon"), resetSettings);
router.get("/geocode", geocodeAddress);

export default router;
