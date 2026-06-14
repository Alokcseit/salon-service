// salon-service/src/controllers/queueController.js

import Booking from "../models/Booking.js";
import Salon from "../models/Salon.js";

import {
  calculateQueueDelays,
} from "../utils/delayCalculator.js";

import {
  sendWhatsApp,
} from "../utils/sendWhatsApp.js";

import {
  sendEmail,
  delayAlertTemplate,
} from "../utils/sendEmail.js";

// @desc   Get today's queue
// @route  GET /api/queue/:salonId
// @access Private
export const getQueue = async (
  req,
  res,
  next
) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(
      tomorrow.getDate() + 1
    );

    const bookings =
      await Booking.find({
        salonId: req.params.salonId,
        date: {
          $gte: today,
          $lt: tomorrow,
        },
        status: {
          $in: [
            "confirmed",
            "in_service",
          ],
        },
      }).sort({
        scheduledStartTime: 1,
      });

    const delayMap =
      calculateQueueDelays(
        bookings
      );

    const queueWithFullData =
      bookings.map((b) => {
        const bObj =
          b.toObject();
        const delay =
          delayMap.find(
            (d) =>
              d.bookingId.toString() ===
              bObj._id.toString()
          );
        return {
          ...bObj,
          estimatedDelay:
            delay?.estimatedDelay ||
            0,
          newArrivalTime:
            delay?.newArrivalTime ||
            null,
          hasSignificantDelay:
            delay?.hasSignificantDelay ||
            false,
        };
      });

    res.status(200).json({
      success: true,
      count:
        queueWithFullData.length,
      data: queueWithFullData,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Start service
// @route  PUT /api/queue/:bookingId/start
// @access Private (salon_owner)
export const startService =
  async (req, res, next) => {
    try {
      const booking =
        await Booking.findByIdAndUpdate(
          req.params.bookingId,
          {
            status: "in_service",
            actualStartTime:
              new Date(),
          },
          {
            new: true,
          }
        );

      if (!booking) {
        return res.status(404).json({
          success: false,
          message:
            "Booking not found",
        });
      }

      // Emit socket event
      if (req.io) {
        req.io
          .to(
            `salon:${booking.salonId}`
          )
          .emit(
            "queue:service_started",
            {
              bookingId:
                booking._id,
              customerId:
                booking.userId,
            }
          );
      }

      res.status(200).json({
        success: true,
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  };

// @desc   Complete service
// @route  PUT /api/queue/:bookingId/complete
// @access Private (salon_owner)
export const completeService =
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

      const actualDuration =
        booking.actualStartTime
          ? Math.round(
              (Date.now() -
                new Date(
                  booking.actualStartTime
                )) /
                60000
            )
          : booking.service
              .estimatedDuration;

      booking.status =
        "completed";

      booking.actualEndTime =
        new Date();

      booking.service.actualDuration =
        actualDuration;

      await booking.save();

      // Update salon stats
      await Salon.findByIdAndUpdate(
        booking.salonId,
        {
          $inc: {
            "stats.completedBookings":
              1,
            "stats.totalRevenue":
              booking.service
                .price,
          },
        }
      );

      // Recalculate delays
      const today =
        new Date();

      today.setHours(
        0,
        0,
        0,
        0
      );

      const tomorrow =
        new Date(today);

      tomorrow.setDate(
        tomorrow.getDate() + 1
      );

      const remainingBookings =
        await Booking.find({
          salonId:
            booking.salonId,
          date: {
            $gte: today,
            $lt: tomorrow,
          },
          status: {
            $in: [
              "confirmed",
            ],
          },
        }).sort({
          scheduledStartTime: 1,
        });

      const delayArray =
        calculateQueueDelays(
          remainingBookings
        );

      const updatedQueue =
        remainingBookings.map(
          (b) => {
            const bObj =
              b.toObject();
            const delay =
              delayArray.find(
                (d) =>
                  d.bookingId.toString() ===
                  bObj._id.toString()
              );
            return {
              ...bObj,
              estimatedDelay:
                delay?.estimatedDelay ||
                0,
              newArrivalTime:
                delay?.newArrivalTime ||
                null,
              hasSignificantDelay:
                delay?.hasSignificantDelay ||
                false,
            };
          }
        );

      // Emit socket event
      if (req.io) {
        req.io
          .to(
            `salon:${booking.salonId}`
          )
          .emit(
            "queue:service_completed",
            {
              bookingId:
                booking._id,
              updatedQueue,
            }
          );
      }

      res.status(200).json({
        success: true,
        data: booking,
        updatedQueue,
      });
    } catch (error) {
      next(error);
    }
  };