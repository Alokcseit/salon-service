// salon-service/src/utils/delayCalculator.js

export const calculateQueueDelays = (bookings) => {
  if (!bookings || bookings.length === 0) return [];

  let cumulativeDelay = 0;

  return bookings.map((booking, index) => {
    if (index === 0) {
      // First booking
      if (
        booking.status === "in_service" &&
        booking.actualStartTime
      ) {
        const elapsed =
          (Date.now() -
            new Date(booking.actualStartTime)) /
          60000;

        const remaining = Math.max(
          0,
          booking.service.estimatedDuration - elapsed
        );

        const scheduledEnd = new Date(
          booking.scheduledStartTime
        );

        scheduledEnd.setMinutes(
          scheduledEnd.getMinutes() +
            booking.service.estimatedDuration
        );

        cumulativeDelay = Math.max(
          0,
          remaining -
            ((scheduledEnd - Date.now()) / 60000)
        );
      }
    } else {
      const prev = bookings[index - 1];

      const prevOverrun = prev.service.actualDuration
        ? Math.max(
            0,
            prev.service.actualDuration -
              prev.service.estimatedDuration
          )
        : 0;

      cumulativeDelay += prevOverrun;
    }

    const scheduledTime = new Date(
      booking.scheduledStartTime
    );

    const newArrivalTime = new Date(
      scheduledTime.getTime() +
        cumulativeDelay * 60000
    );

    return {
      bookingId: booking._id,
      customerId: booking.userId,
      customerPhone: booking.customerPhone,
      originalTime: booking.timeSlot,
      estimatedDelay: Math.round(cumulativeDelay),
      newArrivalTime,
      hasSignificantDelay: cumulativeDelay > 5,
    };
  });
};