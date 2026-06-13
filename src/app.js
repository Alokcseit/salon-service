// salon-service/src/app.js

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import salonRoutes from "./routes/salonRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import queueRoutes from "./routes/queueRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import slotRoutes from "./routes/slotRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import deviceTokenRoutes from "./routes/deviceTokenRoutes.js";

import errorHandler from "./middleware/errorMiddleware.js";

import { checkConnection } from "./config/db.js";

const app = express();

// Security
app.use(helmet());

// CORS
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      process.env.CLIENT_URL,
    ],
    credentials: true,
    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
    ],
  })
);

// Body Parser
app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

// Logger
if (
  process.env.NODE_ENV ===
  "development"
) {
  app.use(morgan("dev"));
}

// Health Check
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    service:
      "Silverscisor Salon Service",
    status: "Running",
    database:
      checkConnection()
        ? "connected"
        : "disconnected",
    timestamp:
      new Date().toISOString(),
  });
});

// Routes
app.use(
  "/api/salon",
  settingsRoutes
);

app.use(
  "/api/salon",
  salonRoutes
);

app.use(
  "/api/services",
  serviceRoutes
);

app.use(
  "/api/upload",
  uploadRoutes
);

app.use(
  "/api/bookings",
  bookingRoutes
);

app.use(
  "/api/queue",
  queueRoutes
);

app.use(
  "/api/profile",
  profileRoutes
);

app.use(
  "/api/slots",
  slotRoutes
);

app.use(
  "/api/notifications",
  notificationRoutes
);

app.use(
  "/api/notifications",
  deviceTokenRoutes
);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;