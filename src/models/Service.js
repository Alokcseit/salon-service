// salon-service/src/models/Service.js

import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
      required: true,
    },

    name: {
      type: String,
      required: [true, "Service name is required"],
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    category: {
      type: String,
      enum: [
        "haircut",
        "beard",
        "color",
        "facial",
        "massage",
        "other",
      ],
      required: true,
    },

    price: {
      type: Number,
      required: [true, "Price is required"],
      min: 0,
    },

    estimatedDuration: {
      type: Number,
      required: [true, "Duration is required"],
      min: 5,
    }, // minutes

    bufferTime: {
      type: Number,
      default: 10,
    }, // cleanup time

    isAvailable: {
      type: Boolean,
      default: true,
    },

    imageUrl: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

serviceSchema.index({ salonId: 1, isAvailable: 1 });

const Service = mongoose.model("Service", serviceSchema);

export default Service;