import Salon from "../models/Salon.js";
import TimeSlot from "../models/TimeSlot.js";
import Booking from "../models/Booking.js";

function generateTimeSlots(open, close, intervalMinutes) {
  const slots = [];
  const [openH, openM] = open.split(":").map(Number);
  const [closeH, closeM] = close.split(":").map(Number);
  let openTotal = openH * 60 + openM;
  let closeTotal = closeH * 60 + closeM;

  // Handle overnight (e.g., 22:00 — 02:00)
  if (closeTotal <= openTotal) closeTotal += 24 * 60;

  for (let mins = openTotal; mins < closeTotal; mins += intervalMinutes) {
    const totalMins = mins % (24 * 60);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    slots.push(
      `${hour12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${period}`
    );
  }
  return slots;
}

// @desc   Get available time slots for a salon on a given date
// @route  GET /api/slots/:salonId?date=YYYY-MM-DD
// @access Public
export const getAvailableSlots = async (req, res, next) => {
  try {
    const { salonId } = req.params;
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, message: "Date is required" });
    }

    const salon = await Salon.findById(salonId);
    if (!salon || !salon.isActive) {
      return res.status(404).json({ success: false, message: "Salon not found" });
    }

    // Keep date at midnight UTC to match how createBooking stores dates
    const slotDate = new Date(date + "T00:00:00.000Z");

    // Use UTC-based day name to stay timezone-agnostic
    const utcDay = slotDate.getUTCDay();
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayName = days[utcDay];
    const dayTiming = salon.timings?.[dayName];

    if (!dayTiming || dayTiming.isClosed) {
      return res.status(200).json({
        success: true,
        date,
        isClosed: true,
        message: "Salon is closed on this day",
        slots: [],
      });
    }

    // Check if a TimeSlot document already exists for this date
    let timeSlotDoc = await TimeSlot.findOne({ salonId: salon._id, date: slotDate });

    if (timeSlotDoc && timeSlotDoc.isHoliday) {
      return res.status(200).json({
        success: true,
        date,
        isClosed: true,
        isHoliday: true,
        holidayNote: timeSlotDoc.holidayNote,
        message: "Salon is on holiday",
        slots: [],
      });
    }

    let slots;
    if (timeSlotDoc && timeSlotDoc.slots.length > 0) {
      // Use existing slots from TimeSlot doc
      slots = timeSlotDoc.slots.map((s) => ({
        time: s.time,
        isAvailable: s.isAvailable,
        isBooked: !!s.bookingId,
        estimatedDelay: s.estimatedDelay,
      }));
    } else {
      const interval = 30; // default 30 min intervals
      const allTimes = generateTimeSlots(dayTiming.open, dayTiming.close, interval);

      // Find existing bookings for this date to mark unavailable
      const existingBookings = await Booking.find({
        salonId: salon._id,
        date: slotDate,
        status: { $in: ["pending", "confirmed", "in_service"] },
      });

      const bookedTimes = new Set(existingBookings.map((b) => b.timeSlot));

      slots = allTimes.map((time) => ({
        time,
        isAvailable: !bookedTimes.has(time),
        isBooked: bookedTimes.has(time),
        estimatedDelay: 0,
      }));
    }

    // Filter out past times for today (UTC)
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const isToday = slotDate.getTime() === todayUTC.getTime();
    if (isToday) {
      const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
      slots = slots.filter((s) => {
        const [time, period] = s.time.split(" ");
        const [h, m] = time.split(":").map(Number);
        let hour = h;
        if (period === "PM" && hour !== 12) hour += 12;
        if (period === "AM" && hour === 12) hour = 0;
        const slotMinutes = hour * 60 + m;
        return slotMinutes > currentMinutes;
      });
    }

    res.status(200).json({
      success: true,
      date,
      isClosed: false,
      slots,
    });
  } catch (error) {
    next(error);
  }
};
