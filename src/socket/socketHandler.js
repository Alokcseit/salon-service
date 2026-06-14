// salon-service/src/socket/socketHandler.js

import Booking from "../models/Booking.js";

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