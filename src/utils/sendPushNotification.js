import { getMessaging } from "../config/firebase.js";
import DeviceToken from "../models/DeviceToken.js";

export const sendPushNotification = async ({ userId, title, body, data }) => {
  try {
    const messaging = getMessaging();
    if (!messaging) {
      return { success: false, skipped: true, reason: "Firebase not configured" };
    }

    const deviceTokens = await DeviceToken.find({ userId });

    if (!deviceTokens.length) {
      return { success: false, skipped: true, reason: "No device tokens" };
    }

    const message = {
      notification: { title, body },
      data: data || {},
    };

    const results = await Promise.allSettled(
      deviceTokens.map((dt) =>
        messaging.send({ ...message, token: dt.token })
      )
    );

    const invalidTokens = [];
    results.forEach((result, idx) => {
      if (result.status === "rejected") {
        const errCode = result.reason?.code;
        if (
          errCode === "messaging/registration-token-not-registered" ||
          errCode === "messaging/invalid-registration-token"
        ) {
          invalidTokens.push(deviceTokens[idx]._id);
        }
      }
    });

    if (invalidTokens.length > 0) {
      await DeviceToken.deleteMany({ _id: { $in: invalidTokens } });
    }

    return { success: true, sent: results.length, invalid: invalidTokens.length };
  } catch (error) {
    console.error("Push notification error:", error.message);
    return { success: false, error: error.message };
  }
};

export const sendPushToSalonOwner = async ({ salon, title, body, data }) => {
  if (!salon?.ownerId) {
    return { success: false, skipped: true };
  }
  return sendPushNotification({
    userId: salon.ownerId,
    title,
    body,
    data: { ...data, salonId: salon._id?.toString() },
  });
};
