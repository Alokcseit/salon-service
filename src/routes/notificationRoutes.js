import express from "express";
import {
  getSalonNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../controllers/notificationController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/salon",
  protect,
  authorize("salon"),
  getSalonNotifications
);

router.put(
  "/salon/read-all",
  protect,
  authorize("salon"),
  markAllNotificationsRead
);

router.put(
  "/:id/read",
  protect,
  authorize("salon"),
  markNotificationRead
);

export default router;
