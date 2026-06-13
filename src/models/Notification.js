// salon-service/src/models/Notification.js

import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },

    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
    },

    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
    },

    type: {
      type: String,
      enum: [
        "booking_confirmed",
        "booking_cancelled",
        "booking_reminder",
        "booking_completed",
        "delay_alert",
        "queue_update",
        "payment_success",
        "promotional",
      ],
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    channels: {
      inApp: {
        sent: Boolean,
        sentAt: Date,
      },

      email: {
        sent: Boolean,
        sentAt: Date,
        error: String,
      },

      whatsapp: {
        sent: Boolean,
        sentAt: Date,
        error: String,
      },

      sms: {
        sent: Boolean,
        sentAt: Date,
        error: String,
      },
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    readAt: Date,
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({
  userId: 1,
  isRead: 1,
  createdAt: -1,
});

// Auto delete notifications after 30 days
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 }
);

const Notification = mongoose.model(
  "Notification",
  notificationSchema
);

export default Notification;