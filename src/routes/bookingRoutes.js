import express from "express";

import {
  createBooking,
  respondToBooking,
  getMyBookings,
  getSalonBookings,
  cancelBooking,
  completeBooking,
} from "../controllers/bookingController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  authorize("customer"),
  createBooking
);

router.put(
  "/:bookingId/respond",
  protect,
  authorize("salon"),
  respondToBooking
);

router.get(
  "/my",
  protect,
  authorize("customer"),
  getMyBookings
);

router.get(
  "/salon",
  protect,
  authorize("salon"),
  getSalonBookings
);

router.put(
  "/:bookingId/cancel",
  protect,
  cancelBooking
);

router.put(
  "/:bookingId/complete",
  protect,
  authorize("salon"),
  completeBooking
);

export default router;
