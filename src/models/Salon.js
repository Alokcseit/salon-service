// salon-service/src/models/Salon.js

import mongoose from "mongoose";

const salonSchema = new mongoose.Schema(
  {
    ownerId: {
      type: String,
      required: true,
      unique: true,
    },

    salonName: {
      type: String,
      required: [true, "Salon name is required"],
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    contact: {
      phone: { type: String, required: true },
      email: { type: String },
      whatsapp: { type: String },
    },

    address: {
      street: String,
      area: String,
      city: String,
      state: String,
      pincode: String,
      country: {
        type: String,
        default: "India",
      },
      location: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number],
          default: [0, 0],
        },
      },
    },

    images: [String],

    timings: {
      monday: {
        open: String,
        close: String,
        isClosed: { type: Boolean, default: false },
      },
      tuesday: {
        open: String,
        close: String,
        isClosed: { type: Boolean, default: false },
      },
      wednesday: {
        open: String,
        close: String,
        isClosed: { type: Boolean, default: false },
      },
      thursday: {
        open: String,
        close: String,
        isClosed: { type: Boolean, default: false },
      },
      friday: {
        open: String,
        close: String,
        isClosed: { type: Boolean, default: false },
      },
      saturday: {
        open: String,
        close: String,
        isClosed: { type: Boolean, default: false },
      },
      sunday: {
        open: String,
        close: String,
        isClosed: { type: Boolean, default: true },
      },
    },

    subscription: {
      plan: {
        type: String,
        enum: ["free", "silver", "gold", "platinum"],
        default: "free",
      },
      tokenBalance: {
        type: Number,
        default: 0,
      },
      planExpiry: Date,
      bookingsUsedThisMonth: {
        type: Number,
        default: 0,
      },
      lastResetDate: {
        type: Date,
        default: Date.now,
      },
    },

    stats: {
      totalBookings: {
        type: Number,
        default: 0,
      },
      completedBookings: {
        type: Number,
        default: 0,
      },
      totalRevenue: {
        type: Number,
        default: 0,
      },
      averageRating: {
        type: Number,
        default: 0,
      },
      totalReviews: {
        type: Number,
        default: 0,
      },
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

salonSchema.index({ "address.location": "2dsphere" });

const Salon = mongoose.model("Salon", salonSchema);

export default Salon;