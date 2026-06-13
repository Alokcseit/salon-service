// salon-service/src/routes/queueRoutes.js

import express from "express";

import {
  getQueue,
  startService,
  completeService,
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

export default router;
