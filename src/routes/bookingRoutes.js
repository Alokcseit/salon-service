// salon-service/src/routes/bookingRoutes.js

import express from "express";

import {
  createBooking,
  getMyBookings,
  getSalonBookings,
  cancelBooking,
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

router.get(
  "/my",
  protect,
  authorize("customer"),
  getMyBookings
);

router.get(
  "/salon",
  protect,
  authorize("salon_owner"),
  getSalonBookings
);

router.put(
  "/:bookingId/cancel",
  protect,
  cancelBooking
);

export default router;