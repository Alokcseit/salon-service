// salon-service/src/models/Booking.js

import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },

    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
      required: true,
    },

    // Customer Details
    customerName: {
      type: String,
      required: true,
    },

    customerPhone: {
      type: String,
      required: true,
    },

    customerEmail: {
      type: String,
    },

    // Service Details
    service: {
      serviceId: mongoose.Schema.Types.ObjectId,

      name: {
        type: String,
        required: true,
      },

      price: {
        type: Number,
        required: true,
      },

      estimatedDuration: {
        type: Number,
        required: true,
      }, // minutes

      actualDuration: {
        type: Number,
        default: null,
      },
    },

    // Time Details
    date: {
      type: Date,
      required: true,
    },

    timeSlot: {
      type: String,
      required: true,
    }, // "10:00 AM"

    scheduledStartTime: Date,
    actualStartTime: Date,
    actualEndTime: Date,

    // Walk-in
    isWalkIn: {
      type: Boolean,
      default: false,
    },

    checkedIn: {
      type: Boolean,
      default: false,
    },

    checkedInAt: Date,

    // Queue Management
    queuePosition: {
      type: Number,
      default: 0,
    },

    estimatedDelay: {
      type: Number,
      default: 0,
    }, // minutes

    notifiedDelay: {
      type: Boolean,
      default: false,
    },

    // Status
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "rejected",
        "in_service",
        "completed",
        "cancelled",
        "no_show",
      ],
      default: "pending",
    },

    // Payment
    payment: {
      status: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending",
      },

      method: String,
      transactionId: String,
      amount: Number,
      paidAt: Date,
    },

    // Review
    review: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },

      comment: String,
      reviewedAt: Date,
    },

    // Cancellation
    cancellation: {
      reason: String,

      cancelledBy: {
        type: String,
        enum: ["customer", "salon", "system"],
      },

      cancelledAt: Date,
    },

    notes: String,
  },
  {
    timestamps: true,
  }
);

bookingSchema.index({ salonId: 1, date: 1, status: 1 });
bookingSchema.index({ userId: 1, createdAt: -1 });

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;