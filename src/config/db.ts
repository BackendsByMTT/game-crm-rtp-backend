import mongoose from "mongoose";
import { config } from "./config";

let isConnected = false; // Track connection status

const connectDB = async () => {
  if (isConnected) {
    console.log("⚡ Using existing database connection");
    return;
  }

  try {
    await mongoose.connect(config.databaseUrl as string, {
      minPoolSize: 5,  // Ensure efficient pooling
      maxPoolSize: 20, // Prevent overloading
    });

    isConnected = true;
    console.log("✅ Database connected successfully");

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected. Reconnecting...");
      isConnected = false;
    });

  } catch (err) {
    console.error("❌ Failed to connect to database:", err);
    process.exit(1);
  }
};

export default connectDB;