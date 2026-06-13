// salon-service/src/controllers/profileController.js

import Salon from "../models/Salon.js";
import Booking from "../models/Booking.js";

// @desc   Get customer profile data (bookings, stats)
// @route  GET /api/profile/customer
// @access Private (customer)
export const getCustomerProfile = async (
  req,
  res,
  next
) => {
  try {
    const bookings = await Booking.find({
      userId: req.user.id,
    })
      .sort({
        createdAt: -1,
      })
      .populate(
        "salonId",
        "salonName"
      );

    const stats = {
      totalBookings:
        bookings.length,

      completedBookings:
        bookings.filter(
          (b) =>
            b.status ===
            "completed"
        ).length,

      cancelledBookings:
        bookings.filter(
          (b) =>
            b.status ===
            "cancelled"
        ).length,

      upcomingBookings:
        bookings.filter(
          (b) =>
            b.status ===
            "confirmed"
        ).length,

      totalSpent: bookings
        .filter(
          (b) =>
            b.status ===
            "completed"
        )
        .reduce(
          (sum, b) =>
            sum +
            b.service.price,
          0
        ),
    };

    res.status(200).json({
      success: true,
      data: {
        bookings,
        stats,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get salon owner profile + stats
// @route  GET /api/profile/salon
// @access Private (salon_owner)
export const getSalonOwnerProfile =
  async (
    req,
    res,
    next
  ) => {
    try {
      const salon =
        await Salon.findOne({
          ownerId:
            req.user.id,
        });

      if (!salon) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Salon not found",
          });
      }

      const today =
        new Date();

      today.setHours(
        0,
        0,
        0,
        0
      );

      const todayBookings =
        await Booking.find({
          salonId:
            salon._id,

          date: {
            $gte: today,
          },

          status: {
            $in: [
              "confirmed",
              "in_service",
              "completed",
            ],
          },
        });

      const todayStats = {
        bookingsCount:
          todayBookings.length,

        revenue:
          todayBookings
            .filter(
              (b) =>
                b.status ===
                "completed"
            )
            .reduce(
              (sum, b) =>
                sum +
                b.service
                  .price,
              0
            ),
      };

      res.status(200).json({
        success: true,
        data: {
          salon,
          todayStats,
          overallStats:
            salon.stats,
        },
      });
    } catch (error) {
      next(error);
    }
  };
  