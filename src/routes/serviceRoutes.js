// salon-service/src/routes/serviceRoutes.js

import express from "express";

import {
  addService,
  getServicesBySalon,
  updateService,
  deleteService,
} from "../controllers/serviceController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/:salonId",
  getServicesBySalon
);

router.post(
  "/",
  protect,
  authorize("salon_owner"),
  addService
);

router.put(
  "/:serviceId",
  protect,
  authorize("salon_owner"),
  updateService
);

router.delete(
  "/:serviceId",
  protect,
  authorize("salon_owner"),
  deleteService
);

export default router;