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
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      process.env.FRONTEND_URL_ALT || 'http://localhost:3001',
    ];
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
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
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"],
  },
});

// Track which users are in which rooms
const roomParticipants = new Map(); // roomId -> Set of socket ids

io.on("connection", (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  // Join a meeting room
  socket.on("join-room", ({ roomId, userId, userName }) => {
    socket.join(roomId);

    // Track participant
    if (!roomParticipants.has(roomId)) {
      roomParticipants.set(roomId, new Set());
    }
    roomParticipants.get(roomId).add(socket.id);

    logger.info(`User ${userName} (${userId}) joined room: ${roomId}`);

    // Notify others in the room
    socket.to(roomId).emit("user-joined", { userId, userName, socketId: socket.id });

    // Send current participants list to the new joiner
    const participants = [...(roomParticipants.get(roomId) || [])].filter(
      (id) => id !== socket.id
    );
    socket.emit("room-participants", { participants });
  });

  // WebRTC Signaling: Offer
  socket.on("offer", ({ roomId, targetId, offer }) => {
    socket.to(targetId).emit("offer", { from: socket.id, offer });
  });

  // WebRTC Signaling: Answer
  socket.on("answer", ({ roomId, targetId, answer }) => {
    socket.to(targetId).emit("answer", { from: socket.id, answer });
  });

  // WebRTC Signaling: ICE Candidate
  socket.on("ice-candidate", ({ roomId, targetId, candidate }) => {
    socket.to(targetId).emit("ice-candidate", { from: socket.id, candidate });
  });

  // Chat message in room
  socket.on("chat-message", ({ roomId, message, userId, userName }) => {
    io.to(roomId).emit("chat-message", {
      message,
      userId,
      userName,
      timestamp: new Date().toISOString(),
    });
  });

  // Screen sharing started
  socket.on("screen-share-started", ({ roomId, userId }) => {
    socket.to(roomId).emit("screen-share-started", { userId, socketId: socket.id });
  });

  // Screen sharing stopped
  socket.on("screen-share-stopped", ({ roomId, userId }) => {
    socket.to(roomId).emit("screen-share-stopped", { userId, socketId: socket.id });
  });

  // Waiting room events
  socket.on("waiting-room-update", ({ roomId, participants }) => {
    socket.to(roomId).emit("waiting-room-update", { participants });
  });

  // Raise hand
  socket.on("raise-hand", ({ roomId, userId, userName }) => {
    socket.to(roomId).emit("raise-hand", { userId, userName, socketId: socket.id });
  });

  // Mute/unmute notification
  socket.on("mute-status", ({ roomId, userId, isMuted }) => {
    socket.to(roomId).emit("mute-status", { userId, isMuted, socketId: socket.id });
  });

  // Video on/off notification
  socket.on("video-status", ({ roomId, userId, isVideoOn }) => {
    socket.to(roomId).emit("video-status", { userId, isVideoOn, socketId: socket.id });
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    logger.info(`Socket disconnected: ${socket.id}`);

    // Remove from all rooms
    for (const [roomId, participants] of roomParticipants.entries()) {
      if (participants.has(socket.id)) {
        participants.delete(socket.id);
        socket.to(roomId).emit("user-left", { socketId: socket.id });
        if (participants.size === 0) {
          roomParticipants.delete(roomId);
        }
      }
    }
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