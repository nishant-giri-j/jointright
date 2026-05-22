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
import Meeting from "./models/meeting.js";
import User from "./models/user.js";
import CyberScore from "./models/cyberScore.js";
import { sendEmail } from "./utils/sendemail.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);

/* ------------------ URL NORMALIZATION MIDDLEWARE ------------------ */
app.use((req, res, next) => {
  if (req.url && req.url.includes("//")) {
    req.url = req.url.replace(/\/\/+/g, "/");
  }
  next();
});

/* ------------------ BASIC MIDDLEWARE ------------------ */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: function (origin, callback) {
    // Dynamically allow all origins to support Vercel preview URLs and local development seamlessly
    callback(null, true);
  },
  credentials: true
}));
app.use(helmet());

/* ------------------ HEALTH CHECK (MANDATORY) ------------------ */
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

/* ------------------ API HEALTH CHECK ------------------ */
app.get("/api/health", async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    let collectionsCount = 0;
    if (dbStatus === "connected") {
      const collections = await mongoose.connection.db.listCollections().toArray();
      collectionsCount = collections.length;
    }
    res.status(200).json({
      status: "OK",
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      database: {
        status: dbStatus,
        name: mongoose.connection.name || "jointright",
        collections: collectionsCount
      },
      memory: {
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal
      }
    });
  } catch (error) {
    logger.error("API Health Check failed", error);
    res.status(500).json({
      status: "ERROR",
      message: error.message
    });
  }
});

/* ------------------ EMAIL DIAGNOSTICS (TEMPORARY) ------------------ */
app.get("/api/test-email-status", async (req, res) => {
  try {
    const testRecipient = req.query.email || "giri.nishant2005@gmail.com";
    logger.info(`Starting live email test from server to: ${testRecipient}`);
    
    // Check credentials loaded
    const credentials = {
      GMAIL_USER: process.env.GMAIL_USER ? `${process.env.GMAIL_USER.substring(0, 4)}***` : "MISSING",
      GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD ? `${process.env.GMAIL_APP_PASSWORD.length} chars` : "MISSING"
    };

    try {
      await sendEmail(
        testRecipient, 
        "JointRight Live SMTP Diagnostic", 
        "This is a diagnostic check from your live Render server to confirm nodemailer SMTP settings."
      );
      res.status(200).json({
        status: "SUCCESS",
        message: `Test email successfully sent to ${testRecipient}!`,
        credentials
      });
    } catch (sendError) {
      res.status(500).json({
        status: "FAILED",
        error: sendError.message,
        stack: sendError.stack,
        credentials
      });
    }
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      message: error.message
    });
  }
});

/* ------------------ RATE LIMITING ------------------ */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => req.path === "/health" || req.path === "/api/health" || req.path === "/api/test-email-status",
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

// Set global Socket.io instance on app
app.set("io", io);

// Track active room participants in-memory
// roomId -> Map of socketId -> { socketId, userId, userName, isHost, cyberScore, isAudioOn, isVideoOn }
const activeRooms = new Map();

// Track in-memory waiting rooms
// roomId -> Map of socketId -> { socketId, userId, userName, cyberScore, joinedAt }
const waitingRoomsMemory = new Map();

// Track admitted users (by userId) to bypass waiting room on reconnection
// roomId -> Set of userIds
const admittedUsersMemory = new Map();

const updateHostsWaitingList = (roomId) => {
  const waitingList = Array.from(waitingRoomsMemory.get(roomId)?.values() || []);
  
  // Robust lookup: scan all connected sockets in this room that are hosts
  const allSockets = Array.from(io.sockets.sockets.values());
  const hosts = allSockets.filter(s => s.roomId === roomId && s.isHost);
  
  logger.info(`Sending waiting room update to ${hosts.length} hosts in room ${roomId}. Waiting count: ${waitingList.length}`);
  
  for (const host of hosts) {
    io.to(host.id).emit("waiting-participants-update", waitingList);
    io.to(host.id).emit("waiting-participants-list", waitingList);
  }
};

io.on("connection", (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  // Join a meeting room
  socket.on("join-room", async ({ roomId, userId, userName }) => {
    try {
      socket.roomId = roomId;
      socket.userId = userId;
      socket.userName = userName;
      socket.isAdmitted = false;
      socket.isHost = false;

      // 1. Fetch meeting & check host status
      const meeting = await Meeting.findOne({ meetingId: roomId });
      if (!meeting) {
        logger.warn(`join-room: Meeting not found for id ${roomId}`);
        socket.emit("rejected-from-meeting", { message: "Meeting not found" });
        return;
      }

      // Check if meeting is ended
      if (meeting.status === 'ended') {
        socket.emit("rejected-from-meeting", { message: "This meeting has already ended." });
        return;
      }

      // Check if meeting is locked (non-hosts cannot join locked meetings)
      let roomMeta = activeRooms.get(roomId);
      if (roomMeta?._locked) {
        const userDocForLock = await User.findOne({ $or: [{ email: userId }, { email: userName }] });
        const isHostCheck = userDocForLock && (meeting.creator === userDocForLock.email || (meeting.hostId && meeting.hostId.equals(userDocForLock._id)));
        if (!isHostCheck) {
          socket.emit("rejected-from-meeting", { message: "This meeting is locked. Only the host can join." });
          return;
        }
      }

      // Check if user is the host/creator
      let isHost = false;
      const userDoc = await User.findOne({ 
        $or: [
          { email: userId }, 
          { email: userName },
          { _id: mongoose.isValidObjectId(userId) ? userId : new mongoose.Types.ObjectId() }
        ] 
      });

      if (userDoc) {
        isHost = meeting.creator === userDoc.email || (meeting.hostId && meeting.hostId.equals(userDoc._id));
      }

      socket.isHost = isHost;

      // Fetch user's cyberScore
      let cyberScoreData = { score: 85, level: 'good', totalMeetings: 0, isRestricted: false };
      if (userDoc) {
        let dbScore = await CyberScore.findOne({ userId: userDoc._id });
        if (!dbScore) {
          dbScore = new CyberScore({ userId: userDoc._id });
          await dbScore.save();
        }
        const trust = dbScore.getTrustIndicator();
        cyberScoreData = {
          score: trust.score,
          level: trust.level,
          totalMeetings: trust.totalMeetings,
          isRestricted: trust.isRestricted
        };
      }
      socket.cyberScore = cyberScoreData;

      // Initialize room memory
      if (!activeRooms.has(roomId)) {
        const newRoomMap = new Map();
        newRoomMap._security = { allowScreenShare: true, allowChat: true, allowUnmute: true };
        activeRooms.set(roomId, newRoomMap);
      }
      if (!waitingRoomsMemory.has(roomId)) {
        waitingRoomsMemory.set(roomId, new Map());
      }

      // Send host status to the socket
      roomMeta = activeRooms.get(roomId);
      socket.emit("host-status", {
        isHost,
        meetingStarted: meeting.status === "ongoing",
        isAdmitted: isHost || !meeting.hostControls?.requireHostApproval,
        security: roomMeta?._security || { allowScreenShare: true, allowChat: true, allowUnmute: true }
      });

      // 2. Handle Waiting Room Logic
      const requireApproval = meeting.hostControls?.requireHostApproval;
      if (!admittedUsersMemory.has(roomId)) {
        admittedUsersMemory.set(roomId, new Set());
      }

      const roomAdmitted = admittedUsersMemory.get(roomId);

      if (isHost) {
        socket.isAdmitted = true;
        roomAdmitted.add(userId);
      } else if (!requireApproval) {
        socket.isAdmitted = true;
        roomAdmitted.add(userId);
      } else if (roomAdmitted.has(userId)) {
        socket.isAdmitted = true;
      }

      if (!socket.isAdmitted) {
        logger.info(`User ${userName} added to waiting room for meeting ${roomId}`);
        
        waitingRoomsMemory.get(roomId).set(socket.id, {
          socketId: socket.id,
          userId,
          userName,
          cyberScore: cyberScoreData,
          joinedAt: new Date()
        });

        socket.emit("waiting-room-status", {
          inWaitingRoom: true,
          message: "Waiting for host to admit you..."
        });

        updateHostsWaitingList(roomId);
        return;
      }

      // 3. User is Admitted: Confirm admission immediately to prompt frontend media capture
      logger.info(`User ${userName} (${userId}) admitted to room: ${roomId} (Waiting for WebRTC ready)`);
      socket.emit("admitted-to-meeting");

      // If the host just joined, immediately push the waiting room list to them
      if (isHost) {
        updateHostsWaitingList(roomId);
      }

    } catch (err) {
      logger.error(`Error in join-room socket: ${err.message}`);
    }
  });

  // Ready for WebRTC: Client triggers this once their media tracks are successfully initialized
  socket.on("ready-for-webrtc", async () => {
    try {
      const { roomId, userId, userName, isHost, cyberScore } = socket;
      if (!roomId) return;

      // Join the low-level room mapping
      socket.join(roomId);
      
      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, new Map());
      }
      
      activeRooms.get(roomId).set(socket.id, {
        socketId: socket.id,
        userId,
        userName,
        isHost,
        cyberScore,
        isAudioOn: true,
        isVideoOn: true
      });

      logger.info(`User ${userName} (${userId}) active in WebRTC pool for room: ${roomId}`);

      // Notify other clients in room that this user is active
      socket.to(roomId).emit("user-connected", {
        socketId: socket.id,
        userId,
        userName,
        isHost,
        cyberScore
      });

      // Send the list of existing active participants to this client
      const existingUsers = [];
      for (const [sid, p] of activeRooms.get(roomId).entries()) {
        if (sid !== socket.id) {
          existingUsers.push(p);
        }
      }
      socket.emit("existing-users", existingUsers);

      // If meeting was not started yet and this is the host, mark as started
      const meeting = await Meeting.findOne({ meetingId: roomId });
      if (meeting && isHost && meeting.status === "scheduled") {
        meeting.status = "ongoing";
        meeting.startedAt = new Date();
        await meeting.save();
        socket.to(roomId).emit("meeting-started");
      }

    } catch (err) {
      logger.error(`Error in ready-for-webrtc: ${err.message}`);
    }
  });

  // Admit participant (host control)
  socket.on("admit-participant", ({ participantId, roomId }) => {
    try {
      if (!socket.isHost) {
        logger.warn(`Non-host ${socket.userName} tried to admit participant`);
        return;
      }

      const waitingRoom = waitingRoomsMemory.get(roomId);
      const participant = waitingRoom?.get(participantId);

      if (participant) {
        waitingRoom.delete(participantId);
        admittedUsersMemory.get(roomId).add(participant.userId);

        const clientSocket = io.sockets.sockets.get(participantId);
        if (clientSocket) {
          clientSocket.isAdmitted = true;
          // Prompt client to obtain camera stream and then signal ready
          clientSocket.emit("admitted-to-meeting");
        }

        updateHostsWaitingList(roomId);
      }
    } catch (err) {
      logger.error(`Error in admit-participant: ${err.message}`);
    }
  });

  // Reject participant (host control)
  socket.on("reject-participant", ({ participantId, roomId }) => {
    try {
      if (!socket.isHost) {
        logger.warn(`Non-host ${socket.userName} tried to reject participant`);
        return;
      }

      const waitingRoom = waitingRoomsMemory.get(roomId);
      const participant = waitingRoom?.get(participantId);

      if (participant) {
        waitingRoom.delete(participantId);

        const clientSocket = io.sockets.sockets.get(participantId);
        if (clientSocket) {
          clientSocket.emit("rejected-from-meeting", { message: "The host has denied your request to join." });
          clientSocket.emit("admission-rejected", { message: "The host has denied your request to join." });
        }

        updateHostsWaitingList(roomId);
      }
    } catch (err) {
      logger.error(`Error in reject-participant: ${err.message}`);
    }
  });

  // Host Mute Participant
  socket.on("host-mute-participant", ({ participantId, roomId, hostName }) => {
    if (!socket.isHost) return;
    io.to(participantId).emit("host-muted-you", { hostName });
  });

  // Host Disable Video
  socket.on("host-disable-video", ({ participantId, roomId, hostName }) => {
    if (!socket.isHost) return;
    io.to(participantId).emit("host-disabled-your-video", { hostName });
  });

  // Host Remove Participant
  socket.on("host-remove-participant", ({ participantId, roomId, hostName, reason }) => {
    if (!socket.isHost) return;
    io.to(participantId).emit("host-removed-you", { hostName, reason });
    
    const targetSocket = io.sockets.sockets.get(participantId);
    if (targetSocket) {
      targetSocket.leave(roomId);
      targetSocket.isAdmitted = false;
    }
    
    if (activeRooms.has(roomId)) {
      activeRooms.get(roomId).delete(participantId);
    }
    
    socket.to(roomId).emit("user-disconnected", { socketId: participantId });
    socket.to(roomId).emit("user-left", { socketId: participantId });
  });

  // Host Mute All
  socket.on("host-mute-all", ({ roomId, hostName }) => {
    if (!socket.isHost) return;
    socket.to(roomId).emit("host-muted-all", { hostName });
  });

  // Host Disable All Videos
  socket.on("host-disable-all-videos", ({ roomId, hostName }) => {
    if (!socket.isHost) return;
    socket.to(roomId).emit("host-disabled-all-videos", { hostName });
  });

  // Lock Meeting
  socket.on("lock-meeting", ({ roomId }) => {
    if (!socket.isHost) return;
    const room = activeRooms.get(roomId);
    if (room) room._locked = true;
    socket.to(roomId).emit("meeting-locked", { hostName: socket.userName });
    socket.emit("meeting-lock-confirmed", { locked: true });
    logger.info(`Host ${socket.userName} locked meeting ${roomId}`);
  });

  // Unlock Meeting
  socket.on("unlock-meeting", ({ roomId }) => {
    if (!socket.isHost) return;
    const room = activeRooms.get(roomId);
    if (room) room._locked = false;
    socket.to(roomId).emit("meeting-unlocked", { hostName: socket.userName });
    socket.emit("meeting-lock-confirmed", { locked: false });
    logger.info(`Host ${socket.userName} unlocked meeting ${roomId}`);
  });

  // Toggle Host Security Permissions
  socket.on("host-toggle-security", ({ roomId, permissions }) => {
    if (!socket.isHost) return;
    const room = activeRooms.get(roomId);
    if (room) {
      room._security = { ...room._security, ...permissions };
      socket.to(roomId).emit("host-security-update", { security: room._security });
      socket.emit("host-security-confirmed", { security: room._security });
      logger.info(`Host ${socket.userName} updated security permissions in room ${roomId}:`, permissions);
    }
  });

  // Make Co-Host
  socket.on("make-cohost", ({ participantId, roomId }) => {
    if (!socket.isHost) return;
    const targetSocket = io.sockets.sockets.get(participantId);
    if (targetSocket) {
      targetSocket.isHost = true;
      const room = activeRooms.get(roomId);
      if (room?.has(participantId)) {
        const p = room.get(participantId);
        room.set(participantId, { ...p, isHost: true });
      }
      targetSocket.emit("promoted-to-cohost", { hostName: socket.userName });
      io.to(roomId).emit("cohost-assigned", { socketId: participantId, userName: targetSocket.userName });
      logger.info(`${targetSocket.userName} promoted to co-host in ${roomId}`);
    }
  });

  // End Meeting For All
  socket.on("end-meeting-for-all", async ({ roomId }) => {
    if (!socket.isHost) return;
    io.to(roomId).emit("meeting-ended-by-host", { hostName: socket.userName });
    try {
      await Meeting.findOneAndUpdate(
        { meetingId: roomId },
        { status: 'ended', endedAt: new Date() }
      );
    } catch (err) {
      logger.error(`Error ending meeting ${roomId}: ${err.message}`);
    }
    activeRooms.delete(roomId);
    waitingRoomsMemory.delete(roomId);
    admittedUsersMemory.delete(roomId);
    logger.info(`Host ${socket.userName} ended meeting ${roomId} for all`);
  });

  // Host unmute request (politely asks participant to unmute)
  socket.on("host-unmute-request", ({ participantId }) => {
    if (!socket.isHost) return;
    io.to(participantId).emit("host-unmute-requested", { hostName: socket.userName });
  });

  // File sharing relay (base64 or metadata)
  socket.on("share-file", (fileData) => {
    if (socket.roomId && socket.isAdmitted) {
      // Validate size (10MB base64 ~ 13.3MB)
      const dataSize = fileData.data ? fileData.data.length : 0;
      if (dataSize > 14 * 1024 * 1024) {
        socket.emit("file-share-error", { message: "File too large. Maximum size is 10MB." });
        return;
      }
      socket.to(socket.roomId).emit("file-shared", {
        ...fileData,
        senderName: socket.userName,
        senderId: socket.id,
        id: Date.now() + Math.random()
      });
      // Echo back to sender so it shows in their own chat
      socket.emit("file-shared", {
        ...fileData,
        senderName: socket.userName + " (You)",
        senderId: socket.id,
        isMine: true,
        id: Date.now() + Math.random()
      });
    }
  });

  // WebRTC Signaling: Signal (Simple Peer uses this)
  socket.on("signal", ({ to, signal }) => {
    io.to(to).emit("signal", { from: socket.id, signal });
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
  socket.on("chat-message", async (data) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    
    const messageData = {
      sender: data.sender || socket.userName,
      message: data.message,
      type: data.type || 'text',
      time: data.time || new Date().toISOString(),
      id: data.id || (Date.now() + Math.random())
    };

    io.to(roomId).emit("chat-message", messageData);

    try {
      await Meeting.updateOne(
        { meetingId: roomId },
        { 
          $push: { 
            chatHistory: { 
              sender: messageData.sender, 
              message: messageData.message, 
              type: messageData.type, 
              time: new Date(messageData.time) 
            } 
          } 
        }
      );
    } catch (err) {
      logger.error(`Error saving chat to database: ${err.message}`);
    }
  });

  // Typing indicators
  socket.on("typing-start", () => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit("user-typing", { userId: socket.id, userName: socket.userName });
    }
  });

  socket.on("typing-stop", () => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit("user-stop-typing", { userId: socket.id });
    }
  });

  // Emoji reactions
  socket.on("emoji-reaction", (data) => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit("emoji-reaction", { emojiData: data.emojiData });
    }
  });

  socket.on("reaction", (reaction) => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit("reaction", reaction);
    }
  });

  // Hand raise
  socket.on("hand-raise-toggle", (isHandRaised) => {
    if (socket.roomId) {
      io.to(socket.roomId).emit("user-hand-raise", { socketId: socket.id, userName: socket.userName, isHandRaised });
    }
  });

  socket.on("raise-hand", ({ roomId, userId, userName }) => {
    socket.to(roomId).emit("raise-hand", { userId, userName, socketId: socket.id });
  });

  // Audio/Video toggle status from participants
  socket.on("toggle-audio", (isAudioOn) => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit("user-toggle-audio", { socketId: socket.id, isAudioOn });
    }
  });

  socket.on("mute-status", ({ roomId, userId, isMuted }) => {
    socket.to(roomId).emit("mute-status", { userId, isMuted, socketId: socket.id });
  });

  socket.on("toggle-video", (isVideoOn) => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit("user-toggle-video", { socketId: socket.id, isVideoOn });
    }
  });

  socket.on("video-status", ({ roomId, userId, isVideoOn }) => {
    socket.to(roomId).emit("video-status", { userId, isVideoOn, socketId: socket.id });
  });

  // Screen sharing
  socket.on("start-screen-share", (data) => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit("user-screen-share", {
        socketId: socket.id,
        userName: socket.userName,
        hasCamera: data?.hasCamera || false,
        isVideoOn: data?.isVideoOn || false
      });
    }
  });

  // Screen sharing started (legacy support)
  socket.on("screen-share-started", ({ roomId, userId }) => {
    socket.to(roomId).emit("screen-share-started", { userId, socketId: socket.id });
  });

  socket.on("stop-screen-share", () => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit("user-stop-screen-share", { socketId: socket.id, userName: socket.userName });
    }
  });

  // Screen sharing stopped (legacy support)
  socket.on("screen-share-stopped", ({ roomId, userId }) => {
    socket.to(roomId).emit("screen-share-stopped", { userId, socketId: socket.id });
  });

  // Cyber score room join
  socket.on("join-cyber-score-room", ({ userId }) => {
    socket.join(`cyber-score-${userId}`);
    logger.info(`Socket ${socket.id} joined cyber-score room for user ${userId}`);
  });

  socket.on("disconnect", () => {
    logger.info(`Socket disconnected: ${socket.id}`);
    const roomId = socket.roomId;

    if (roomId) {
      if (waitingRoomsMemory.has(roomId)) {
        waitingRoomsMemory.get(roomId).delete(socket.id);
        updateHostsWaitingList(roomId);
      }

      if (activeRooms.has(roomId)) {
        activeRooms.get(roomId).delete(socket.id);
        
        socket.to(roomId).emit("user-disconnected", { socketId: socket.id });
        socket.to(roomId).emit("user-left", { socketId: socket.id });
        
        if (activeRooms.get(roomId).size === 0) {
          activeRooms.delete(roomId);
          waitingRoomsMemory.delete(roomId);
          admittedUsersMemory.delete(roomId);
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