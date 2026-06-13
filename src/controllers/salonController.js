// salon-service/src/controllers/salonController.js

import Salon from "../models/Salon.js";

// @desc   Create or get salon profile
// @route  POST /api/salon/profile
// @access Private (salon_owner)
export const createOrGetSalon = async (req, res, next) => {
  try {
    let salon = await Salon.findOne({
      ownerId: req.user.id,
    });

    if (salon) {
      return res.status(200).json({
        success: true,
        data: salon,
      });
    }

    salon = await Salon.create({
      ownerId: req.user.id,
      salonName: req.body.salonName || "My Salon",
      contact: {
        phone: req.body.phone || "",
      },
    });

    res.status(201).json({
      success: true,
      data: salon,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Update salon profile
// @route  PUT /api/salon/profile
// @access Private (salon_owner)
export const updateSalon = async (req, res, next) => {
  try {
    const salon = await Salon.findOneAndUpdate(
      { ownerId: req.user.id },
      { $set: req.body },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    res.status(200).json({
      success: true,
      data: salon,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get salon by ID (public)
// @route  GET /api/salon/:salonId
// @access Public
export const getSalonById = async (
  req,
  res,
  next
) => {
  try {
    const salon = await Salon.findById(
      req.params.salonId
    );

    if (!salon || !salon.isActive) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    res.status(200).json({
      success: true,
      data: salon,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get all active salons
// @route  GET /api/salon
// @access Public
export const getAllSalons = async (
  req,
  res,
  next
) => {
  try {
    const { city, search } = req.query;

    const filter = {
      isActive: true,
    };

    if (city) {
      filter["address.city"] = new RegExp(
        city,
        "i"
      );
    }

    if (search) {
      filter.salonName = new RegExp(
        search,
        "i"
      );
    }

    const salons = await Salon.find(
      filter
    ).select("-subscription");

    res.status(200).json({
      success: true,
      count: salons.length,
      data: salons,
    });
  } catch (error) {
    next(error);
  }
};