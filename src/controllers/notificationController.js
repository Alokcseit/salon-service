import Notification from "../models/Notification.js";
import Salon from "../models/Salon.js";

// @desc   Get notifications for salon owner
// @route  GET /api/notifications/salon
// @access Private (salon_owner)
export const getSalonNotifications = async (req, res, next) => {
  try {
    const salon = await Salon.findOne({ ownerId: req.user.id });
    if (!salon) {
      return res.status(404).json({ success: false, message: "Salon not found" });
    }

    const notifications = await Notification.find({ salonId: salon._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      salonId: salon._id,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Mark notification as read
// @route  PUT /api/notifications/:id/read
// @access Private (salon_owner)
export const markNotificationRead = async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

// @desc   Mark all notifications as read
// @route  PUT /api/notifications/salon/read-all
// @access Private (salon_owner)
export const markAllNotificationsRead = async (req, res, next) => {
  try {
    const salon = await Salon.findOne({ ownerId: req.user.id });
    if (!salon) {
      return res.status(404).json({ success: false, message: "Salon not found" });
    }

    await Notification.updateMany(
      { salonId: salon._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.status(200).json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    next(error);
  }
};
