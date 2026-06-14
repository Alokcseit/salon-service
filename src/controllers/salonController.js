// salon-service/src/controllers/salonController.js

import Salon from "../models/Salon.js";
import Booking from "../models/Booking.js";

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
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

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

// @desc   Get nearby salons with search, rating & openNow filters
// @route  GET /api/salon/nearby
// @access Public
export const getNearbySalons = async (req, res, next) => {
  try {
    const { lat, lng, maxDistance = 10000, search, sortBy } = req.query;

    const filter = { isActive: true };

    if (lat && lng) {
      filter["address.location"] = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: parseInt(maxDistance),
        },
      };
    }

    if (search) {
      filter.salonName = new RegExp(search, "i");
    }

    let salons = await Salon.find(filter).select("-subscription").lean();

    // Open Now filter — evaluate in-memory cos day keys are dynamic
    if (sortBy === "openNow") {
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const now = new Date();
      const dayName = days[now.getDay()];
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      salons = salons.filter((salon) => {
        const dayTiming = salon.timings?.[dayName];
        if (!dayTiming || dayTiming.isClosed) return false;
        if (!dayTiming.open || !dayTiming.close) return false;
        if (dayTiming.open <= dayTiming.close) {
          return currentTime >= dayTiming.open && currentTime <= dayTiming.close;
        }
        // Overnight hours (e.g., 22:00 — 02:00)
        return currentTime >= dayTiming.open || currentTime <= dayTiming.close;
      });
    }

    // Top Rated sorting
    if (sortBy === "rating") {
      salons.sort((a, b) => (b.stats?.averageRating || 0) - (a.stats?.averageRating || 0));
    }

    res.status(200).json({
      success: true,
      count: salons.length,
      data: salons,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get all reviews for a salon
// @route  GET /api/salon/:salonId/reviews
// @access Public
export const getSalonReviews =
  async (req, res, next) => {
    try {
      const bookings =
        await Booking.find({
          salonId:
            req.params.salonId,
          status: "completed",
          "review.rating": {
            $exists: true,
          },
        })
          .select(
            "customerName review createdAt"
          )
          .sort({
            "review.reviewedAt":
              -1,
          });

      const salon =
        await Salon.findById(
          req.params.salonId
        ).select(
          "stats.averageRating stats.totalReviews salonName"
        );

      res.status(200).json({
        success: true,
        data: bookings,
        averageRating:
          salon?.stats
            ?.averageRating || 0,
        totalReviews:
          salon?.stats
            ?.totalReviews || 0,
        salonName:
          salon?.salonName ||
          "",
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