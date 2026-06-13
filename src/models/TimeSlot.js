// salon-service/src/models/TimeSlot.js

import mongoose from "mongoose";

const timeSlotSchema = new mongoose.Schema(
  {
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    slots: [
      {
        time: {
          type: String,
          required: true,
        },

        isAvailable: {
          type: Boolean,
          default: true,
        },

        bookingId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Booking",
          default: null,
        },

        estimatedDelay: {
          type: Number,
          default: 0,
        },
      },
    ],

    isHoliday: {
      type: Boolean,
      default: false,
    },

    holidayNote: String,
  },
  {
    timestamps: true,
  }
);

timeSlotSchema.index(
  { salonId: 1, date: 1 },
  { unique: true }
);

const TimeSlot = mongoose.model(
  "TimeSlot",
  timeSlotSchema
);

export default TimeSlot;