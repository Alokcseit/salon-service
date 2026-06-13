// salon-service/src/config/db.js

import mongoose from "mongoose";

let isConnected = false;
let retryCount = 0;
const MAX_RETRIES = 5;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
    });

    isConnected = true;
    retryCount = 0;

    console.log(`Salon DB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Salon DB Error: ${error.message}`);

    if (retryCount < MAX_RETRIES) {
      retryCount++;

      const delay = Math.min(
        1000 * Math.pow(2, retryCount),
        30000
      );

      console.log(
        `Retrying in ${delay / 1000}s... (${retryCount}/${MAX_RETRIES})`
      );

      setTimeout(connectDB, delay);
    } else {
      console.error("Max retries reached. Exiting...");
      process.exit(1);
    }
  }
};

mongoose.connection.on("disconnected", () => {
  isConnected = false;
  console.warn("Salon DB disconnected. Reconnecting...");
});

mongoose.connection.on("error", (err) => {
  isConnected = false;
  console.error("Salon DB error:", err);
});

const checkConnection = () => isConnected;

export { connectDB, checkConnection };