// salon-service/src/socket/socketHandler.js

import Booking from "../models/Booking.js";

import {
  calculateQueueDelays,
} from "../utils/delayCalculator.js";

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