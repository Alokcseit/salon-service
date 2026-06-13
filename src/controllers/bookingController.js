import Booking from "../models/Booking.js";
import Salon from "../models/Salon.js";
import TimeSlot from "../models/TimeSlot.js";
import Notification from "../models/Notification.js";

import {
  sendEmail,
  bookingConfirmedTemplate,
} from "../utils/sendEmail.js";

import {
  sendWhatsApp,
} from "../utils/sendWhatsApp.js";

// @desc   Create booking request (pending)
// @route  POST /api/bookings
// @access Private (customer)
export const createBooking = async (req, res, next) => {
  try {
    const {
      salonId,
      serviceId,
      serviceName,
      servicePrice,
      serviceDuration,
      date,
      timeSlot,
      customerName,
      customerPhone,
      customerEmail,
    } = req.body;

    const salon = await Salon.findById(salonId);
    if (!salon) {
      return res.status(404).json({ success: false, message: "Salon not found" });
    }

    // Check if slot already booked
    const existingBooking = await Booking.findOne({
      salonId,
      date: new Date(date),
      timeSlot,
      status: { $in: ["pending", "confirmed", "in_service"] },
    });

    if (existingBooking) {
      return res.status(400).json({ success: false, message: "This time slot is already booked" });
    }

    const [time, period] = timeSlot.split(" ");
    const [hours, minutes] = time.split(":");
    let hour = parseInt(hours);
    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;

    const scheduledStartTime = new Date(date);
    scheduledStartTime.setHours(hour, parseInt(minutes), 0, 0);

    // Create booking with pending status
    const booking = await Booking.create({
      userId: req.user.id,
      salonId,
      customerName,
      customerPhone,
      customerEmail,
      service: {
        serviceId,
        name: serviceName,
        price: servicePrice,
        estimatedDuration: serviceDuration,
      },
      date: new Date(date),
      timeSlot,
      scheduledStartTime,
      status: "pending",
    });

    // Notify salon owner about new booking request
    await Notification.create({
      userId: salon.ownerId,
      salonId,
      bookingId: booking._id,
      type: "booking_request",
      title: "New Booking Request",
      message: `${customerName} wants to book ${serviceName} on ${new Date(date).toLocaleDateString("en-IN")} at ${timeSlot}`,
      channels: { inApp: { sent: true, sentAt: new Date() } },
    });

    res.status(201).json({
      success: true,
      message: "Booking request sent! Waiting for salon confirmation.",
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Salon responds to booking request (confirm/reject)
// @route  PUT /api/bookings/:bookingId/respond
// @access Private (salon_owner)
export const respondToBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { action, rejectReason } = req.body;

    if (!["confirm", "reject"].includes(action)) {
      return res.status(400).json({ success: false, message: "Action must be 'confirm' or 'reject'" });
    }

    const salon = await Salon.findOne({ ownerId: req.user.id });
    if (!salon) {
      return res.status(404).json({ success: false, message: "Salon not found" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.salonId.toString() !== salon._id.toString()) {
      return res.status(403).json({ success: false, message: "Not your salon's booking" });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({ success: false, message: "Booking is not in pending status" });
    }

    if (action === "confirm") {
      booking.status = "confirmed";

      // Update salon booking stats
      await Salon.findByIdAndUpdate(salon._id, {
        $inc: {
          "subscription.bookingsUsedThisMonth": 1,
          "stats.totalBookings": 1,
        },
      });

      // Notify customer
      await Notification.create({
        userId: booking.userId,
        salonId: salon._id,
        bookingId: booking._id,
        type: "booking_confirmed",
        title: "Booking Confirmed!",
        message: `Your ${booking.service.name} appointment on ${booking.date.toLocaleDateString("en-IN")} at ${booking.timeSlot} is confirmed by ${salon.salonName}.`,
        channels: { inApp: { sent: true, sentAt: new Date() } },
      });

      // Send email
      if (booking.customerEmail) {
        await sendEmail({
          to: booking.customerEmail,
          subject: "Booking Confirmed - Silverscisor",
          html: bookingConfirmedTemplate(booking.customerName, booking),
        });
      }

      // Send WhatsApp (gold/platinum only)
      if (["gold", "platinum"].includes(salon.subscription.plan) && booking.customerPhone) {
        const msg = `Hi ${booking.customerName}! Your ${booking.service.name} booking is confirmed for ${booking.date.toLocaleDateString("en-IN")} at ${booking.timeSlot}. Price: ₹${booking.service.price}. See you soon! - ${salon.salonName}`;
        const waResult = await sendWhatsApp({ phone: booking.customerPhone, message: msg });
        if (!waResult.skipped) {
          await Salon.findByIdAndUpdate(salon._id, { $inc: { "subscription.tokenBalance": -1 } });
        }
      }
    } else {
      booking.status = "rejected";
      booking.cancellation = {
        reason: rejectReason || "Rejected by salon",
        cancelledBy: "salon",
        cancelledAt: new Date(),
      };

      // Notify customer
      await Notification.create({
        userId: booking.userId,
        salonId: salon._id,
        bookingId: booking._id,
        type: "booking_rejected",
        title: "Booking Rejected",
        message: `Your ${booking.service.name} booking on ${booking.date.toLocaleDateString("en-IN")} at ${booking.timeSlot} was declined. Reason: ${rejectReason || "Not specified"}`,
        channels: { inApp: { sent: true, sentAt: new Date() } },
      });
    }

    await booking.save();

    res.status(200).json({
      success: true,
      message: action === "confirm" ? "Booking confirmed!" : "Booking rejected",
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get bookings for customer
// @route  GET /api/bookings/my
// @access Private (customer)
export const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate("salonId", "salonName address contact");

    res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    next(error);
  }
};

// @desc   Get bookings for salon owner
// @route  GET /api/bookings/salon
// @access Private (salon_owner)
export const getSalonBookings = async (req, res, next) => {
  try {
    const salon = await Salon.findOne({ ownerId: req.user.id });
    if (!salon) {
      return res.status(404).json({ success: false, message: "Salon not found" });
    }

    const { date, status } = req.query;
    const filter = { salonId: salon._id };

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      filter.date = { $gte: startOfDay, $lte: endOfDay };
    }

    if (status) {
      filter.status = status;
    }

    const bookings = await Booking.find(filter).sort({ scheduledStartTime: 1 });

    res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    next(error);
  }
};

// @desc   Cancel booking
// @route  PUT /api/bookings/:bookingId/cancel
// @access Private
export const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (!["pending", "confirmed"].includes(booking.status)) {
      return res.status(400).json({ success: false, message: "Cannot cancel this booking" });
    }

    booking.status = "cancelled";
    booking.cancellation = {
      reason: req.body.reason || "Cancelled by user",
      cancelledBy: req.user.userType === "salon" ? "salon" : "customer",
      cancelledAt: new Date(),
    };

    await booking.save();

    res.status(200).json({ success: true, message: "Booking cancelled", data: booking });
  } catch (error) {
    next(error);
  }
};

// @desc   Complete booking
// @route  PUT /api/bookings/:bookingId/complete
// @access Private (salon_owner)
export const completeBooking = async (req, res, next) => {
  try {
    const salon = await Salon.findOne({ ownerId: req.user.id });
    if (!salon) {
      return res.status(404).json({ success: false, message: "Salon not found" });
    }

    const booking = await Booking.findById(req.params.bookingId);
    if (!booking || booking.salonId.toString() !== salon._id.toString()) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    booking.status = "completed";
    await booking.save();

    res.status(200).json({ success: true, message: "Booking completed", data: booking });
  } catch (error) {
    next(error);
  }
};
