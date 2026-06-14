// salon-service/src/routes/salonRoutes.js

import express from "express";

import {
  createOrGetSalon,
  updateSalon,
  getSalonById,
  getAllSalons,
  getNearbySalons,
  getSalonReviews,
} from "../controllers/salonController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/nearby", getNearbySalons);

router.get("/", getAllSalons);

router.get(
  "/:salonId/reviews",
  getSalonReviews
);

router.get(
  "/:salonId",
  getSalonById
);

router.post(
  "/profile",
  protect,
  authorize("salon"),
  createOrGetSalon
);

router.put(
  "/profile",
  protect,
  authorize("salon"),
  updateSalon
);

export default router;