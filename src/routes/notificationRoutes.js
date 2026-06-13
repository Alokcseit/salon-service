import express from "express";
import {
  getSalonNotifications,
  getCustomerNotifications,
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

router.get(
  "/customer",
  protect,
  authorize("customer"),
  getCustomerNotifications
);

router.put(
  "/read-all",
  protect,
  markAllNotificationsRead
);

router.put(
  "/:id/read",
  protect,
  markNotificationRead
);

export default router;
