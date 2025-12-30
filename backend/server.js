// server.js

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";
import logger from "./utils/logger.js";

// Routes
import adminRoutes from "./routes/adminRoutes.js";
import loginRoutes from "./routes/loginroute.js";
import signupRoutes from "./routes/signuproute.js";
import meetingRoutes from "./routes/meetingroute.js";
import breakoutRoutes from "./routes/breakoutRoutes.js";
import cyberScoreRoutes from "./routes/cyberScoreRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import waitingRoomRoutes from "./routes/waitingRoomRoutes.js";
import contactRoutes from "./routes/contact.js";
import profileRoutes from "./routes/profileRoutes.js";
import notificationRoutes from "./routes/notifications.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);

/* ------------------ BASIC MIDDLEWARE ------------------ */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());

/* ------------------ HEALTH CHECK (MANDATORY) ------------------ */
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

/* ------------------ RATE LIMITING ------------------ */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => req.path === "/health",
});
app.use(limiter);

/* ------------------ DATABASE ------------------ */
connectDB()
  .then(() => logger.info("MongoDB connected"))
  .catch((err) => logger.error("MongoDB connection error", err));

/* ------------------ ROUTES ------------------ */
app.use("/api/admin", adminRoutes);
app.use("/api/login", loginRoutes);
app.use("/api/signup", signupRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/breakouts", breakoutRoutes);
app.use("/api/cyber-score", cyberScoreRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/waiting-room", waitingRoomRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/notifications", notificationRoutes);

/* ------------------ SOCKET.IO ------------------ */
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on("disconnect", () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

/* ------------------ STATIC (OPTIONAL) ------------------ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ------------------ START SERVER ------------------ */
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  logger.info(`Server running on port ${PORT}`);
});