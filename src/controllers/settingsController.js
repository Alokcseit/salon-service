import Salon from "../models/Salon.js";
import TimeSlot from "../models/TimeSlot.js";

export const getSchedule = async (req, res, next) => {
  try {
    const salon = await Salon.findOne({ ownerId: req.user.id });
    if (!salon) {
      return res.status(404).json({ success: false, message: "Salon not found" });
    }

    const { startDate, endDate } = req.query;
    const filter = { salonId: salon._id };
    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const slots = await TimeSlot.find(filter).sort({ date: 1 });
    res.status(200).json({ success: true, data: slots });
  } catch (error) {
    next(error);
  }
};

export const setHoliday = async (req, res, next) => {
  try {
    const salon = await Salon.findOne({ ownerId: req.user.id });
    if (!salon) {
      return res.status(404).json({ success: false, message: "Salon not found" });
    }

    const { date, note } = req.body;
    if (!date) {
      return res.status(400).json({ success: false, message: "Date is required" });
    }

    const slotDate = new Date(date);
    slotDate.setHours(0, 0, 0, 0);

    await TimeSlot.findOneAndUpdate(
      { salonId: salon._id, date: slotDate },
      {
        $set: {
          isHoliday: true,
          holidayNote: note || "",
          slots: [],
        },
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, message: "Holiday set successfully" });
  } catch (error) {
    next(error);
  }
};

export const removeHoliday = async (req, res, next) => {
  try {
    const salon = await Salon.findOne({ ownerId: req.user.id });
    if (!salon) {
      return res.status(404).json({ success: false, message: "Salon not found" });
    }

    const { date } = req.body;
    if (!date) {
      return res.status(400).json({ success: false, message: "Date is required" });
    }

    const slotDate = new Date(date);
    slotDate.setHours(0, 0, 0, 0);

    await TimeSlot.findOneAndDelete({ salonId: salon._id, date: slotDate });

    res.status(200).json({ success: true, message: "Holiday removed successfully" });
  } catch (error) {
    next(error);
  }
};

export const setOfflineSlots = async (req, res, next) => {
  try {
    const salon = await Salon.findOne({ ownerId: req.user.id });
    if (!salon) {
      return res.status(404).json({ success: false, message: "Salon not found" });
    }

    const { date, timeRanges } = req.body;
    if (!date || !timeRanges || !Array.isArray(timeRanges)) {
      return res.status(400).json({ success: false, message: "Date and timeRanges are required" });
    }

    const slotDate = new Date(date);
    slotDate.setHours(0, 0, 0, 0);

    const dayTimings = salon.timings[slotDate.toLocaleString('en-us', { weekday: 'long' }).toLowerCase()];
    if (!dayTimings || dayTimings.isClosed) {
      return res.status(400).json({ success: false, message: "Salon is closed on this day" });
    }

    const allSlots = generateTimeSlots(dayTimings.open, dayTimings.close, 30);

    const updatedSlots = allSlots.map((time) => {
      const isOffline = timeRanges.some(
        (range) => time >= range.start && time < range.end
      );
      return {
        time,
        isAvailable: !isOffline,
        bookingId: null,
        estimatedDelay: 0,
      };
    });

    await TimeSlot.findOneAndUpdate(
      { salonId: salon._id, date: slotDate },
      {
        $set: {
          slots: updatedSlots,
          isHoliday: false,
          holidayNote: "",
        },
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, message: "Offline slots updated successfully" });
  } catch (error) {
    next(error);
  }
};

export const resetSettings = async (req, res, next) => {
  try {
    const salon = await Salon.findOne({ ownerId: req.user.id });
    if (!salon) {
      return res.status(404).json({ success: false, message: "Salon not found" });
    }

    await TimeSlot.deleteMany({ salonId: salon._id });

    res.status(200).json({ success: true, message: "All settings reset successfully" });
  } catch (error) {
    next(error);
  }
};

function generateTimeSlots(open, close, intervalMinutes) {
  const slots = [];
  const [openH, openM] = open.split(":").map(Number);
  const [closeH, closeM] = close.split(":").map(Number);
  const openTotal = openH * 60 + openM;
  const closeTotal = closeH * 60 + closeM;

  for (let mins = openTotal; mins < closeTotal; mins += intervalMinutes) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    slots.push(
      `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
    );
  }
  return slots;
}
