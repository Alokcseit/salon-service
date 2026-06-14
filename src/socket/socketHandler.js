// salon-service/src/socket/socketHandler.js

import mongoose from "mongoose";

import Booking from "../models/Booking.js";

import Salon from "../models/Salon.js";

import {
  calculateQueueDelays,
} from "../utils/delayCalculator.js";

import {
  sendPushNotification,
} from "../utils/sendPushNotification.js";

import {
  sendEmail,
  delayAlertTemplate,
} from "../utils/sendEmail.js";

import {
  sendWhatsApp,
} from "../utils/sendWhatsApp.js";

const handleSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(
      `Socket connected: ${socket.id}`
    );

    // Join salon room
    socket.on(
      "queue:join",
      async ({
        salonId,
        role,
      }) => {
        try {
          socket.join(
            `salon:${salonId}`
          );

          console.log(
            `${role} joined salon:${salonId}`
          );

          // Send current queue state
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
            tomorrow.getDate() +
              1
          );

          const bookings =
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

          const queueWithDelays =
            calculateQueueDelays(
              bookings
            );

          socket.emit(
            "queue:state",
            queueWithDelays
          );
        } catch (error) {
          socket.emit(
            "error",
            {
              message:
                "Failed to join queue",
            }
          );
        }
      }
    );

    // Leave salon room
    socket.on(
      "queue:leave",
      ({ salonId }) => {
        socket.leave(
          `salon:${salonId}`
        );
      }
    );

    // Salon notifies a customer about their delay
    socket.on(
      "queue:notify_delay",
      async ({
        salonId,
        bookingId,
      }) => {
        try {
          const booking =
            await Booking.findById(
              bookingId
            ).populate(
              "salonId"
            );

          if (!booking) {
            return socket.emit(
              "error",
              {
                message:
                  "Booking not found",
              }
            );
          }

          // Calculate delays for this salon
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
            tomorrow.getDate() +
              1
          );

          const salonBookings =
            await Booking.find({
              salonId:
                booking.salonId
                  ._id,
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

          const delays =
            calculateQueueDelays(
              salonBookings
            );

          const delay =
            delays.find(
              (d) =>
                d.bookingId.toString() ===
                bookingId
            );

          if (!delay) {
            return socket.emit(
              "error",
              {
                message:
                  "Could not calculate delay",
              }
            );
          }

          // Mark notified
          await Booking.findByIdAndUpdate(
            bookingId,
            {
              notifiedDelay:
                true,
            }
          );

          // Emit delay alert to all in salon room
          io.to(
            `salon:${salonId}`
          ).emit(
            "queue:delay_alert",
            {
              bookingId,
              estimatedDelay:
                delay.estimatedDelay,
              newArrivalTime:
                delay.newArrivalTime,
              hasSignificantDelay:
                delay.hasSignificantDelay,
            }
          );

          // Send push notification to customer
          sendPushNotification({
            userId:
              booking.userId,
            title: `Appointment Delay - ${booking.salonId?.salonName || "Salon"}`,
            body: `Your appointment is delayed by ${delay.estimatedDelay} mins. New arrival time: ${new Date(delay.newArrivalTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`,
            data: {
              type: "delay_alert",
              bookingId,
              salonId,
            },
          });

          // Send email
          if (
            booking.customerEmail
          ) {
            const newTimeStr =
              delay.newArrivalTime.toLocaleTimeString(
                "en-IN",
                {
                  hour: "2-digit",
                  minute:
                    "2-digit",
                  hour12: true,
                }
              );

            sendEmail({
              to: booking.customerEmail,
              subject: `Appointment Delay Alert - ${booking.salonId?.salonName || "Salon"}`,
              html: delayAlertTemplate(
                booking.customerName,
                booking.timeSlot,
                newTimeStr,
                delay.estimatedDelay
              ),
            });
          }

          // Confirm back to salon user
          socket.emit(
            "queue:notify_delay_confirmed",
            {
              bookingId,
              message: `Customer notified about ${delay.estimatedDelay} min delay`,
            }
          );
        } catch (error) {
          console.error(
            "Notify delay error:",
            error.message
          );
          socket.emit(
            "error",
            {
              message:
                "Failed to notify customer about delay",
            }
          );
        }
      }
    );

    // Salon starts today's queue
    socket.on(
      "queue:started",
      async ({ salonId }) => {
        try {
          console.log(
            `Queue started for salon:${salonId}`
          );

          // Get today's confirmed bookings
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
            tomorrow.getDate() +
              1
          );

          const bookings =
            await Booking.find({
              salonId,
              date: {
                $gte: today,
                $lt: tomorrow,
              },
              status:
                "confirmed",
            });

          // Notify all customers via push
          for (const booking of bookings) {
            sendPushNotification({
              userId:
                booking.userId,
              title: `Queue Started!`,
              body: `Your salon has started today's queue. Your booking at ${booking.timeSlot} is coming up!`,
              data: {
                type: "queue_started",
                salonId,
                bookingId:
                  booking._id.toString(),
              },
            });
          }

          // Broadcast to all in salon room
          io.to(
            `salon:${salonId}`
          ).emit(
            "queue:started",
            {
              message:
                "Today's queue has started!",
            }
          );
        } catch (error) {
          console.error(
            "Queue start error:",
            error.message
          );
        }
      }
    );

    // Salon closes today's queue
    socket.on(
      "queue:closed",
      async ({ salonId }) => {
        try {
          console.log(
            `Queue closing for salon:${salonId}`
          );

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
            tomorrow.getDate() +
              1
          );

          // Get salon info
          const salon =
            await Salon.findById(
              salonId
            );

          // Cancel all remaining confirmed bookings
          const remaining =
            await Booking.find({
              salonId,
              date: {
                $gte: today,
                $lt: tomorrow,
              },
              status:
                "confirmed",
            });

          // Calculate day stats
          const completed =
            await Booking.countDocuments(
              {
                salonId,
                date: {
                  $gte: today,
                  $lt: tomorrow,
                },
                status:
                  "completed",
              }
            );

          // Send day summary to salon owner
          if (
            salon?.ownerId
          ) {
            const totalRevenue =
              await Booking.aggregate(
                [
                  {
                    $match:
                      {
                        salonId:
                          new mongoose.Types.ObjectId(
                            salonId
                          ),
                        date: {
                          $gte: today,
                          $lt: tomorrow,
                        },
                        status:
                          "completed",
                      },
                  },
                  {
                    $group:
                      {
                        _id: null,
                        total:
                          {
                            $sum:
                              "$service.price",
                          },
                      },
                  },
                ]
              );

            sendEmail({
              to: salon.contact
                ?.email,
              subject: `Day Summary - ${salon.salonName}`,
              html: `<h2>Day Summary</h2>
<p>Bookings completed: ${completed}</p>
<p>Remaining cancelled: ${remaining.length}</p>
<p>Total revenue: ₹${
                totalRevenue[0]
                  ?.total || 0
              }</p>
<p>Queue closed at: ${new Date().toLocaleTimeString("en-IN")}</p>`,
            });
          }

          for (const booking of remaining) {
            booking.status =
              "cancelled";
            booking.cancellation =
              {
                reason:
                  "Salon closed early",
                cancelledBy:
                  "salon",
                cancelledAt:
                  new Date(),
              };
            await booking.save();

            // Push notification
            sendPushNotification({
              userId:
                booking.userId,
              title: `Salon Closed`,
              body: `Sorry! ${salon?.salonName || "Salon"} has closed for today. Your booking is cancelled. Please book again.`,
              data: {
                type: "queue_closed",
                salonId,
                bookingId:
                  booking._id.toString(),
              },
            });

            // WhatsApp
            if (
              booking.customerPhone
            ) {
              sendWhatsApp({
                phone:
                  booking.customerPhone,
                message: `Sorry! ${salon?.salonName || "Salon"} is closed for today. Your booking at ${booking.timeSlot} is cancelled. Please book again. - Team ${salon?.salonName || "Salon"}`,
              });
            }

            // Email
            if (
              booking.customerEmail
            ) {
              sendEmail({
                to: booking.customerEmail,
                subject: `Booking Cancelled - ${salon?.salonName || "Salon"}`,
                html: `<p>Hi ${booking.customerName},</p><p>Sorry! ${salon?.salonName || "Salon"} has closed for today. Your booking at ${booking.timeSlot} has been cancelled.</p><p>Please book again. We apologise for the inconvenience.</p>`,
              });
            }
          }

          // Broadcast to all in salon room
          io.to(
            `salon:${salonId}`
          ).emit(
            "queue:closed",
            {
              message: `Queue closed. ${remaining.length} bookings cancelled.`,
              cancelledCount:
                remaining.length,
              completedCount:
                completed,
            }
          );
        } catch (error) {
          console.error(
            "Queue close error:",
            error.message
          );
        }
      }
    );

    // Customer checks in (arrived at salon)
    socket.on(
      "queue:checkin",
      async ({
        salonId,
        bookingId,
      }) => {
        try {
          const booking =
            await Booking.findByIdAndUpdate(
              bookingId,
              {
                checkedIn: true,
                checkedInAt:
                  new Date(),
              },
              { new: true }
            );

          if (!booking) {
            return socket.emit(
              "error",
              {
                message:
                  "Booking not found for check-in",
              }
            );
          }

          // Notify salon
          io.to(
            `salon:${salonId}`
          ).emit(
            "queue:checkin",
            {
              bookingId,
              customerName:
                booking.customerName,
              message: `${booking.customerName} has arrived at the salon!`,
            }
          );
        } catch (error) {
          console.error(
            "Check-in error:",
            error.message
          );
        }
      }
    );

    socket.on(
      "disconnect",
      (reason) => {
        console.log(
          `Socket disconnected: ${socket.id}, Reason: ${reason}`
        );
      }
    );

    socket.on(
      "error",
      (error) => {
        console.error(
          `Socket error for ${socket.id}:`,
          error
        );
      }
    );
  });

  io.engine.on(
    "connection_error",
    (err) => {
      console.error(
        "Socket.io connection error:",
        err
      );
    }
  );
};

export default handleSocket;