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
  sendPushNotification,
} from "../utils/sendPushNotification.js";

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

// @desc   Add walk-in customer
// @route  POST /api/queue/walk-in
// @access Private (salon_owner)
export const walkIn =
  async (req, res, next) => {
    try {
      const {
        salonId,
        customerName,
        customerPhone,
        serviceId,
        serviceName,
        servicePrice,
        serviceDuration,
      } = req.body;

      if (
        !salonId ||
        !serviceName ||
        !serviceDuration
      ) {
        return res.status(400).json({
          success: false,
          message:
            "salonId, serviceName, and serviceDuration are required",
        });
      }

      // Check salon queue settings
      const salon =
        await Salon.findById(
          salonId
        );

      if (!salon) {
        return res.status(404).json({
          success: false,
          message:
            "Salon not found",
        });
      }

      if (
        !salon.queueSettings
          ?.walkInAllowed
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Walk-ins not allowed for this salon",
        });
      }

      // Count today's active bookings
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

      const activeCount =
        await Booking.countDocuments(
          {
            salonId,
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
          }
        );

      if (
        activeCount >=
        (salon.queueSettings
          ?.maxQueueSize || 20)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Queue is full. Max queue size reached.",
        });
      }

      // Find next available slot
      const lastBooking =
        await Booking.findOne(
          {
            salonId,
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
          }
        ).sort({
          scheduledStartTime:
            -1,
        });

      const now = new Date();
      let nextTime = null;

      if (lastBooking) {
        nextTime =
          new Date(
            lastBooking.scheduledStartTime
          );
        nextTime.setMinutes(
          nextTime.getMinutes() +
            (lastBooking
              .service
              .estimatedDuration ||
              30)
        );
      }

      if (
        !nextTime ||
        nextTime < now
      ) {
        nextTime = now;
        nextTime.setMinutes(
          Math.ceil(
            nextTime.getMinutes() /
              15
          ) * 15
        );
      }

      const timeSlotStr =
        nextTime.toLocaleTimeString(
          "en-IN",
          {
            hour: "2-digit",
            minute:
              "2-digit",
            hour12: true,
          }
        );

      // Create walk-in booking
      const booking =
        await Booking.create({
          userId:
            customerPhone ||
            `walkin_${Date.now()}`,
          salonId,
          customerName:
            customerName ||
            "Walk-in Customer",
          customerPhone:
            customerPhone || "",
          service: {
            serviceId:
              serviceId ||
              null,
            name: serviceName,
            price:
              servicePrice || 0,
            estimatedDuration:
              serviceDuration,
          },
          date: today,
          timeSlot: timeSlotStr,
          scheduledStartTime:
            nextTime,
          status: "confirmed",
          isWalkIn: true,
        });

      // Calculate delays
      const allBookings =
        await Booking.find({
          salonId,
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
          allBookings
        );

      const queueData =
        allBookings.map((b) => {
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

      // Emit socket event
      if (req.io) {
        req.io
          .to(
            `salon:${salonId}`
          )
          .emit(
            "queue:state",
            {
              message: `Walk-in added: ${booking.customerName}`,
            }
          );
      }

      res.status(201).json({
        success: true,
        data: booking,
        queue: queueData,
        nextSlot: timeSlotStr,
      });
    } catch (error) {
      next(error);
    }
  };

// @desc   Check-in a booking (customer arrived)
// @route  PUT /api/queue/:bookingId/checkin
// @access Private
export const checkIn =
  async (req, res, next) => {
    try {
      const booking =
        await Booking.findByIdAndUpdate(
          req.params.bookingId,
          {
            checkedIn: true,
            checkedInAt:
              new Date(),
          },
          { new: true }
        );

      if (!booking) {
        return res.status(404).json({
          success: false,
          message:
            "Booking not found",
        });
      }

      // Update salon stats
      await Salon.findByIdAndUpdate(
        booking.salonId,
        {
          $inc: {
            "stats.totalBookings": 1,
          },
        }
      );

      // Emit socket event
      if (req.io) {
        req.io
          .to(
            `salon:${booking.salonId}`
          )
          .emit(
            "queue:checkin",
            {
              bookingId:
                booking._id,
              customerName:
                booking.customerName,
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

      // Notify next customer "your turn"
      if (remainingBookings.length > 0) {
        const nextBooking =
          remainingBookings[0];
        sendPushNotification({
          userId:
            nextBooking.userId,
          title: `Your Turn!`,
          body: `The previous customer is done. Please get ready, your turn is coming up!`,
          data: {
            type: "your_turn",
            salonId:
              booking.salonId.toString(),
            bookingId:
              nextBooking._id.toString(),
          },
        });
      }

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