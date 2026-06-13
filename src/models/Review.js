// salon-service/src/models/Review.js

import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
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

    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    comment: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    subRatings: {
      quality: {
        type: Number,
        min: 1,
        max: 5,
      },

      cleanliness: {
        type: Number,
        min: 1,
        max: 5,
      },

      staff: {
        type: Number,
        min: 1,
        max: 5,
      },

      value: {
        type: Number,
        min: 1,
        max: 5,
      },
    },

    salonResponse: {
      message: String,
      respondedAt: Date,
    },

    isVerified: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index({ salonId: 1, createdAt: -1 });

const Review = mongoose.model("Review", reviewSchema);

export default Review;