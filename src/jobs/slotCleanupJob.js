// salon-service/src/jobs/slotCleanupJob.js

import cron from "node-cron";

import TimeSlot from "../models/TimeSlot.js";
import Booking from "../models/Booking.js";
import Salon from "../models/Salon.js";

const startSlotCleanupJob = () => {
  // Daily at midnight
  cron.schedule("0 0 * * *", async () => {
    console.log("Running slot cleanup job...");

    try {
      // Delete slots older than 30 days
      const thirtyDaysAgo = new Date();

      thirtyDaysAgo.setDate(
        thirtyDaysAgo.getDate() - 30
      );

      await TimeSlot.deleteMany({
        date: {
          $lt: thirtyDaysAgo,
        },
      });

      // Reset monthly booking count on 1st day of month
      const today = new Date();

      if (today.getDate() === 1) {
        await Salon.updateMany(
          {},
          {
            $set: {
              "subscription.bookingsUsedThisMonth": 0,
            },
          }
        );

        console.log(
          "Monthly booking counts reset"
        );
      }

      // Mark old confirmed bookings as no_show
      const yesterday = new Date();

      yesterday.setDate(
        yesterday.getDate() - 1
      );

      yesterday.setHours(
        23,
        59,
        59,
        999
      );

      await Booking.updateMany(
        {
          date: {
            $lte: yesterday,
          },
          status: "confirmed",
        },
        {
          status: "no_show",
        }
      );

      console.log(
        "✅ Slot cleanup completed"
      );
    } catch (error) {
      console.error(
        "Slot cleanup failed:",
        error
      );
    }
  });

  console.log(
    "✅ Slot cleanup job started (daily midnight)"
  );
};

export { startSlotCleanupJob };