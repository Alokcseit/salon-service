// salon-service/server.js

import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

import app from "./src/app.js";

import { connectDB } from "./src/config/db.js";

import handleSocket from "./src/socket/socketHandler.js";

import { startDelayJob } from "./src/jobs/delayJob.js";
import { startReminderJob } from "./src/jobs/reminderJob.js";
import { startSlotCleanupJob } from "./src/jobs/slotCleanupJob.js";

dotenv.config();

const PORT = process.env.PORT || 5002;

let server;

const startServer = async () => {
  try {
    // 1. Connect Database
    await connectDB();

    // 2. Create HTTP Server
    server = createServer(app);

    // 3. Setup Socket.io
    const io = new Server(server, {
      cors: {
        origin: [
          "http://localhost:5173",
          process.env.CLIENT_URL,
        ],
        methods: ["GET", "POST"],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Make io available in req
    app.use((req, res, next) => {
      req.io = io;
      next();
    });

    // Start Socket Handler
    handleSocket(io);

    // 4. Start Background Jobs
    startDelayJob(io);
    startReminderJob(io);
    startSlotCleanupJob();

    // 5. Start Server
    server.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════╗
║   Silverscisor Salon Service      ║
║   Port: ${PORT}                     
║   Status: Running ✅               ║
╚═══════════════════════════════════╝
      `);
    });

  } catch (error) {
    console.error(
      "Failed to start server:",
      error
    );

    process.exit(1);
  }
};

startServer();

// Unhandled Promise Rejections
process.on(
  "unhandledRejection",
  (reason) => {
    console.error(
      "Unhandled Rejection:",
      reason
    );

    server?.close(() =>
      process.exit(1)
    );
  }
);

// Uncaught Exceptions
process.on(
  "uncaughtException",
  (error) => {
    console.error(
      "Uncaught Exception:",
      error
    );

    server?.close(() =>
      process.exit(1)
    );
  }
);

// SIGTERM
process.on("SIGTERM", () => {
  console.log(
    "SIGTERM received. Shutting down gracefully..."
  );

  server?.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

// SIGINT (Ctrl + C)
process.on("SIGINT", () => {
  console.log(
    "SIGINT received. Shutting down..."
  );

  server?.close(() =>
    process.exit(0)
  );
});