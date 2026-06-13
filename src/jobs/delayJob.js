// salon-service/src/jobs/delayJob.js

import cron from "node-cron";

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

let isRunning = false;

const startDelayJob = (io) => {
  // Every 1 minute
  cron.schedule("* * * * *", async () => {
    if (isRunning) return;

    isRunning = true;

    try {
      const today = new Date();

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

      // Active bookings
      const bookings =
        await Booking.find({
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

          notifiedDelay:
            false,
        }).populate("salonId");

      // Group by salon
      const bySalon = {};

      bookings.forEach((b) => {
        const id =
          b.salonId._id.toString();

        if (!bySalon[id]) {
          bySalon[id] = [];
        }

        bySalon[id].push(b);
      });

      for (const [
        salonId,
        salonBookings,
      ] of Object.entries(
        bySalon
      )) {
        try {
          const delays =
            calculateQueueDelays(
              salonBookings
            );

          for (const delay of delays) {
            if (
              !delay.hasSignificantDelay
            )
              continue;

            const booking =
              salonBookings.find(
                (b) =>
                  b._id.toString() ===
                  delay.bookingId.toString()
              );

            if (!booking) continue;

            const salon =
              booking.salonId;

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

            // WhatsApp
            if (
              [
                "gold",
                "platinum",
              ].includes(
                salon
                  .subscription
                  .plan
              ) &&
              booking.customerPhone
            ) {
              const msg = `Hi ${booking.customerName}! Your appointment at ${salon.salonName} is delayed by ${delay.estimatedDelay} mins. New arrival time: ${newTimeStr}. Sorry for inconvenience!`;

              await sendWhatsApp({
                phone:
                  booking.customerPhone,
                message: msg,
              });
            }

            // Email
            if (
              booking.customerEmail
            ) {
              await sendEmail({
                to: booking.customerEmail,

                subject: `Appointment Delay Alert - ${salon.salonName}`,

                html: delayAlertTemplate(
                  booking.customerName,
                  booking.timeSlot,
                  newTimeStr,
                  delay.estimatedDelay
                ),
              });
            }

            // Mark notified
            await Booking.findByIdAndUpdate(
              delay.bookingId,
              {
                notifiedDelay: true,
              }
            );

            // Socket event
            if (io) {
              io.to(
                `salon:${salonId}`
              ).emit(
                "queue:delay_alert",
                delay
              );
            }
          }
        } catch (err) {
          console.error(
            `Delay job error for salon ${salonId}:`,
            err.message
          );
        }
      }
    } catch (error) {
      console.error(
        "Delay job failed:",
        error
      );
    } finally {
      isRunning = false;
    }
  });

  console.log(
    "✅ Delay job started (every 1 min)"
  );
};

export { startDelayJob };
