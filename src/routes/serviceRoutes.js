// salon-service/src/routes/serviceRoutes.js

import express from "express";

import {
  addService,
  getMyServices,
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
  "/my-services",
  protect,
  authorize("salon"),
  getMyServices
);

router.get(
  "/:salonId",
  getServicesBySalon
);

router.post(
  "/",
  protect,
  authorize("salon"),
  addService
);

router.put(
  "/:serviceId",
  protect,
  authorize("salon"),
  updateService
);

router.delete(
  "/:serviceId",
  protect,
  authorize("salon"),
  deleteService
);

export default router;