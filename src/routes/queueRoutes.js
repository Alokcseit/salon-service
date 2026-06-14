// salon-service/src/routes/queueRoutes.js

import express from "express";

import {
  getQueue,
  startService,
  completeService,
  walkIn,
  checkIn,
} from "../controllers/queueController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/:salonId",
  protect,
  getQueue
);

router.put(
  "/:bookingId/start",
  protect,
  authorize("salon"),
  startService
);

router.put(
  "/:bookingId/complete",
  protect,
  authorize("salon"),
  completeService
);

router.post(
  "/walk-in",
  protect,
  authorize("salon"),
  walkIn
);

router.put(
  "/:bookingId/checkin",
  protect,
  checkIn
);

export default router;
