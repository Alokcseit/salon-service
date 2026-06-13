// salon-service/src/controllers/bookingController.js

import Booking from "../models/Booking.js";
import Salon from "../models/Salon.js";
import TimeSlot from "../models/TimeSlot.js";
import Notification from "../models/Notification.js";

import {
  sendEmail,
  bookingConfirmedTemplate,
} from "../utils/sendEmail.js";

import {
  sendWhatsApp,
} from "../utils/sendWhatsApp.js";

// @desc   Create booking
// @route  POST /api/bookings
// @access Private (customer)
export const createBooking = async (
  req,
  res,
  next
) => {
  try {
    const {
      salonId,
      serviceId,
      serviceName,
      servicePrice,
      serviceDuration,
      date,
      timeSlot,
      customerName,
      customerPhone,
      customerEmail,
    } = req.body;

    // Check salon exists
    const salon = await Salon.findById(
      salonId
    );

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    // Check free plan limit
    if (
      salon.subscription.plan === "free" &&
      salon.subscription
        .bookingsUsedThisMonth >= 10
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Salon booking limit reached. Please contact the salon directly.",
      });
    }

    // Check if slot already booked
    const existingBooking =
      await Booking.findOne({
        salonId,
        date: new Date(date),
        timeSlot,
        status: {
          $in: [
            "pending",
            "confirmed",
            "in_service",
          ],
        },
      });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message:
          "This time slot is already booked",
      });
    }

    // Calculate scheduled start time
    const [time, period] =
      timeSlot.split(" ");

    const [hours, minutes] =
      time.split(":");

    let hour = parseInt(hours);

    if (
      period === "PM" &&
      hour !== 12
    )
      hour += 12;

    if (
      period === "AM" &&
      hour === 12
    )
      hour = 0;

    const scheduledStartTime =
      new Date(date);

    scheduledStartTime.setHours(
      hour,
      parseInt(minutes),
      0,
      0
    );

    // Create booking
    const booking =
      await Booking.create({
        userId: req.user.id,
        salonId,
        customerName,
        customerPhone,
        customerEmail,

        service: {
          serviceId,
          name: serviceName,
          price: servicePrice,
          estimatedDuration:
            serviceDuration,
        },

        date: new Date(date),
        timeSlot,
        scheduledStartTime,
        status: "confirmed",
      });

    // Update salon booking count
    await Salon.findByIdAndUpdate(
      salonId,
      {
        $inc: {
          "subscription.bookingsUsedThisMonth":
            1,
          "stats.totalBookings": 1,
        },
      }
    );

    // Save notification
    await Notification.create({
      userId: req.user.id,
      salonId,
      bookingId: booking._id,

      type: "booking_confirmed",

      title: "Booking Confirmed!",

      message: `Your ${serviceName} appointment on ${new Date(
        date
      ).toLocaleDateString(
        "en-IN"
      )} at ${timeSlot} is confirmed.`,

      channels: {
        inApp: {
          sent: true,
          sentAt: new Date(),
        },
      },
    });

    // Send email
    if (customerEmail) {
      const emailResult =
        await sendEmail({
          to: customerEmail,
          subject:
            "Booking Confirmed - Silverscisor",
          html: bookingConfirmedTemplate(
            customerName,
            booking
          ),
        });

      await Notification.findOneAndUpdate(
        {
          bookingId: booking._id,
        },
        {
          "channels.email": {
            sent:
              emailResult.success,
            sentAt: new Date(),
          },
        }
      );
    }

    // Send WhatsApp
    if (
      ["gold", "platinum"].includes(
        salon.subscription.plan
      ) &&
      customerPhone
    ) {
      const msg = `Hi ${customerName}! Your ${serviceName} booking is confirmed for ${new Date(
        date
      ).toLocaleDateString(
        "en-IN"
      )} at ${timeSlot}. Price: ₹${servicePrice}. See you soon! - Silverscisor`;

      const waResult =
        await sendWhatsApp({
          phone: customerPhone,
          message: msg,
        });

      if (!waResult.skipped) {
        await Salon.findByIdAndUpdate(
          salonId,
          {
            $inc: {
              "subscription.tokenBalance":
                -1,
            },
          }
        );
      }
    }

    res.status(201).json({
      success: true,
      message:
        "Booking confirmed!",
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get bookings for customer
// @route  GET /api/bookings/my
// @access Private (customer)
export const getMyBookings =
  async (req, res, next) => {
    try {
      const bookings =
        await Booking.find({
          userId: req.user.id,
        })
          .sort({
            createdAt: -1,
          })
          .populate(
            "salonId",
            "salonName address contact"
          );

      res.status(200).json({
        success: true,
        count: bookings.length,
        data: bookings,
      });
    } catch (error) {
      next(error);
    }
  };

// @desc   Get bookings for salon owner
// @route  GET /api/bookings/salon
// @access Private (salon_owner)
export const getSalonBookings =
  async (req, res, next) => {
    try {
      const salon =
        await Salon.findOne({
          ownerId: req.user.id,
        });

      if (!salon) {
        return res.status(404).json({
          success: false,
          message:
            "Salon not found",
        });
      }

      const { date, status } =
        req.query;

      const filter = {
        salonId: salon._id,
      };

      if (date) {
        const startOfDay =
          new Date(date);

        startOfDay.setHours(
          0,
          0,
          0,
          0
        );

        const endOfDay =
          new Date(date);

        endOfDay.setHours(
          23,
          59,
          59,
          999
        );

        filter.date = {
          $gte: startOfDay,
          $lte: endOfDay,
        };
      }

      if (status) {
        filter.status = status;
      }

      const bookings =
        await Booking.find(filter)
          .sort({
            scheduledStartTime: 1,
          });

      res.status(200).json({
        success: true,
        count: bookings.length,
        data: bookings,
      });
    } catch (error) {
      next(error);
    }
  };

// @desc   Cancel booking
// @route  PUT /api/bookings/:bookingId/cancel
// @access Private
export const cancelBooking =
  async (req, res, next) => {
    try {
      const booking =
        await Booking.findById(
          req.params.bookingId
        );

      if (!booking) {
        return res.status(404).json({
          success: false,
          message:
            "Booking not found",
        });
      }

      if (
        ![
          "pending",
          "confirmed",
        ].includes(
          booking.status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot cancel this booking",
        });
      }

      booking.status =
        "cancelled";

      booking.cancellation = {
        reason:
          req.body.reason ||
          "Cancelled by user",

        cancelledBy:
          req.user.userType ===
          "salon_owner"
            ? "salon"
            : "customer",

        cancelledAt:
          new Date(),
      };

      await booking.save();

      res.status(200).json({
        success: true,
        message:
          "Booking cancelled",
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  };
  