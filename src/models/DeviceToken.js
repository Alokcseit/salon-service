import mongoose from "mongoose";

const deviceTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
    },
    token: {
      type: String,
      required: true,
    },
    platform: {
      type: String,
      enum: ["web", "android", "ios"],
      default: "web",
    },
    userAgent: String,
  },
  {
    timestamps: true,
  }
);

deviceTokenSchema.index({ userId: 1, token: 1 }, { unique: true });
deviceTokenSchema.index({ salonId: 1 });

const DeviceToken = mongoose.model("DeviceToken", deviceTokenSchema);
export default DeviceToken;
