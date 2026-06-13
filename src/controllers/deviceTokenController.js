import DeviceToken from "../models/DeviceToken.js";
import Salon from "../models/Salon.js";

export const registerDeviceToken = async (req, res, next) => {
  try {
    const { token, platform, userAgent } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: "Token is required" });
    }

    let salonId = null;
    if (req.user.userType === "salon") {
      const salon = await Salon.findOne({ ownerId: req.user.id });
      if (salon) salonId = salon._id;
    }

    await DeviceToken.findOneAndUpdate(
      { userId: req.user.id, token },
      {
        userId: req.user.id,
        token,
        salonId,
        platform: platform || "web",
        userAgent: userAgent || req.headers["user-agent"],
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, message: "Device token registered" });
  } catch (error) {
    next(error);
  }
};

export const unregisterDeviceToken = async (req, res, next) => {
  try {
    const { token } = req.body;

    await DeviceToken.findOneAndDelete({
      userId: req.user.id,
      token,
    });

    res.status(200).json({ success: true, message: "Device token removed" });
  } catch (error) {
    next(error);
  }
};
