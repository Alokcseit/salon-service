// salon-service/src/controllers/serviceController.js

import Service from "../models/Service.js";
import Salon from "../models/Salon.js";

// @desc   Add service
// @route  POST /api/services
// @access Private (salon_owner)
export const addService = async (req, res, next) => {
  try {
    const salon = await Salon.findOne({
      ownerId: req.user.id,
    });

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    const service = await Service.create({
      ...req.body,
      salonId: salon._id,
    });

    res.status(201).json({
      success: true,
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get services by salon
// @route  GET /api/services/:salonId
// @access Public
export const getServicesBySalon = async (
  req,
  res,
  next
) => {
  try {
    const services = await Service.find({
      salonId: req.params.salonId,
      isAvailable: true,
    });

    res.status(200).json({
      success: true,
      count: services.length,
      data: services,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Update service
// @route  PUT /api/services/:serviceId
// @access Private (salon_owner)
export const updateService = async (
  req,
  res,
  next
) => {
  try {
    const salon = await Salon.findOne({
      ownerId: req.user.id,
    });

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    const service =
      await Service.findOneAndUpdate(
        {
          _id: req.params.serviceId,
          salonId: salon._id,
        },
        { $set: req.body },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Delete service
// @route  DELETE /api/services/:serviceId
// @access Private (salon_owner)
export const deleteService = async (
  req,
  res,
  next
) => {
  try {
    const salon = await Salon.findOne({
      ownerId: req.user.id,
    });

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    await Service.findOneAndUpdate(
      {
        _id: req.params.serviceId,
        salonId: salon._id,
      },
      {
        isAvailable: false,
      }
    );

    res.status(200).json({
      success: true,
      message: "Service removed",
    });
  } catch (error) {
    next(error);
  }
};