// salon-service/src/routes/profileRoutes.js

import express from "express";

import {
  getCustomerProfile,
  getSalonOwnerProfile,
} from "../controllers/profileController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/customer",
  protect,
  authorize("customer"),
  getCustomerProfile
);

router.get(
  "/salon",
  protect,
  authorize("salon_owner"),
  getSalonOwnerProfile
);

export default router;