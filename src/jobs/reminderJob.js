// salon-service/src/jobs/reminderJob.js

import cron from "node-cron";

import Booking from "../models/Booking.js";

import {
  sendEmail,
} from "../utils/sendEmail.js";

import {
  sendWhatsApp,
} from "../utils/sendWhatsApp.js";

const startReminderJob = (io) => {
  // Every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    try {
      const oneHourLater = new Date(
        Date.now() + 60 * 60 * 1000
      );

      const oneHourAndFifteen =
        new Date(
          Date.now() +
            75 * 60 * 1000
        );

      const upcomingBookings =
        await Booking.find({
          scheduledStartTime: {
            $gte: oneHourLater,
            $lte: oneHourAndFifteen,
          },
          status: "confirmed",
        }).populate(
          "salonId",
          "salonName address contact"
        );

      for (const booking of upcomingBookings) {
        try {
          const salon =
            booking.salonId;

          const timeStr =
            booking.timeSlot;

          // Email Reminder
          if (
            booking.customerEmail
          ) {
            await sendEmail({
              to: booking.customerEmail,

              subject: `Reminder: Appointment in 1 hour - ${salon.salonName}`,

              html: `
                <div style="font-family: Arial; padding: 20px;">
                  <h2>⏰ Appointment Reminder</h2>

                  <p>Hi ${booking.customerName},</p>

                  <p>
                    Your
                    <strong>${booking.service.name}</strong>
                    appointment at
                    <strong>${salon.salonName}</strong>
                    is in 1 hour.
                  </p>

                  <p>
                    <strong>Time:</strong>
                    ${timeStr}
                  </p>

                  <p>
                    <strong>Address:</strong>
                    ${salon.address?.area},
                    ${salon.address?.city}
                  </p>

                  <p>
                    Please arrive 5 minutes early!
                  </p>
                </div>
              `,
            });
          }

          // WhatsApp Reminder
          if (
            booking.customerPhone
          ) {
            const msg = `Reminder: Your ${booking.service.name} at ${salon.salonName} is in 1 hour at ${timeStr}. Please arrive on time!`;

            await sendWhatsApp({
              phone:
                booking.customerPhone,
              message: msg,
            });
          }
        } catch (err) {
          console.error(
            `Reminder failed for booking ${booking._id}:`,
            err.message
          );
        }
      }
    } catch (error) {
      console.error(
        "Reminder job failed:",
        error
      );
    }
  });

  console.log(
    "✅ Reminder job started (every 15 min)"
  );
};

export { startReminderJob };
