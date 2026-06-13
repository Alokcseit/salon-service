// salon-service/src/utils/sendEmail.js

import nodemailer from "nodemailer";
import env from "../config/env.js";

const transporter = nodemailer.createTransport({
  host: env.EMAIL_HOST,
  port: env.EMAIL_PORT,
  secure: false,
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASS,
  },
});

export const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error("Email error:", error.message);

    return {
      success: false,
      error: error.message,
    };
  }
};

export const bookingConfirmedTemplate = (
  customerName,
  booking
) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #f43f5e, #f59e0b); padding: 20px; border-radius: 10px 10px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">
        ✅ Booking Confirmed!
      </h1>
    </div>

    <div style="padding: 24px; background: #f9fafb;">
      <h2 style="color: #1f2937;">
        Hi ${customerName},
      </h2>

      <p style="color: #4b5563;">
        Your appointment is confirmed. Here are the details:
      </p>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr style="background: white;">
          <td style="padding: 10px 16px; color: #6b7280; font-weight: 500;">
            Service
          </td>
          <td style="padding: 10px 16px; font-weight: 600; color: #1f2937;">
            ${booking.service.name}
          </td>
        </tr>

        <tr style="background: #f3f4f6;">
          <td style="padding: 10px 16px; color: #6b7280; font-weight: 500;">
            Date
          </td>
          <td style="padding: 10px 16px; font-weight: 600; color: #1f2937;">
            ${new Date(booking.date).toLocaleDateString("en-IN")}
          </td>
        </tr>

        <tr style="background: white;">
          <td style="padding: 10px 16px; color: #6b7280; font-weight: 500;">
            Time
          </td>
          <td style="padding: 10px 16px; font-weight: 600; color: #1f2937;">
            ${booking.timeSlot}
          </td>
        </tr>

        <tr style="background: #f3f4f6;">
          <td style="padding: 10px 16px; color: #6b7280; font-weight: 500;">
            Amount
          </td>
          <td style="padding: 10px 16px; font-weight: 700; color: #f43f5e; font-size: 18px;">
            ₹${booking.service.price}
          </td>
        </tr>
      </table>

      <p style="color: #6b7280; font-size: 14px;">
        Please arrive 5 minutes early. See you soon!
      </p>
    </div>
  </div>
`;

export const delayAlertTemplate = (
  customerName,
  originalTime,
  newTime,
  delayMinutes
) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #f59e0b, #ef4444); padding: 20px; border-radius: 10px 10px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 22px;">
        ⏰ Appointment Delay Alert
      </h1>
    </div>

    <div style="padding: 24px; background: #f9fafb;">
      <h2 style="color: #1f2937;">
        Hi ${customerName},
      </h2>

      <p style="color: #4b5563;">
        We're running <strong>${delayMinutes} minutes late</strong> today.
      </p>

      <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0; color: #92400e;">
          <strong>Original time:</strong> ${originalTime}<br/>
          <strong>New arrival time:</strong> ${newTime}
        </p>
      </div>

      <p style="color: #6b7280; font-size: 14px;">
        We apologize for the inconvenience. Please arrive at the new time.
      </p>
    </div>
  </div>
`;