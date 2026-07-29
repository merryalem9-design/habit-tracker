import "dotenv/config";
import express from "express";
import { createServer } from "http";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import habitRoutes from "./routes/habitRoutes";
import checkInRoutes from "./routes/checkInRoutes";
import statsRoutes from "./routes/statsRoutes";
import groupRoutes from "./routes/groupRoutes";
import postRoutes from "./routes/postRoutes";
import distractRoutes from "./routes/distractRoutes";
import reportRoutes from "./routes/reportRoutes";
import chatRoutes from "./routes/chatRoutes";

import { initSocket } from "./socket";
import logger from "./lib/logger";

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 4000;

// --- SINGLE SOURCE OF TRUTH FOR CORS (Removed the duplicate) ---
// This dynamically allows your production domain AND every unique preview deployment Vercel generates.
const allowedOrigins = [
  'http://localhost:5173', // Local development
  'https://habit-tracker-mqbc-puce.vercel.app', // Your main Vercel production domain
  // Regex: Allows `habit-tracker-mqbc-` followed by anything ending in `.vercel.app`
  /^https:\/\/habit-tracker-mqbc-.*\.vercel\.app$/
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if the origin matches an allowed string or RegExp pattern
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true // Crucial for allowing Authorization headers (JWT)
}));

app.use(express.json());
app.use(morgan("dev"));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/habits", habitRoutes);
app.use("/api/checkins", checkInRoutes);
app.use("/api", statsRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/distract-me", distractRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/chat", chatRoutes);


app.get("/", (req, res) => {
  res.json({ status: "Habit tracker API is running" });
});

// Pass the same CORS options to Socket.io
// Pass the same CORS options to Socket.io
initSocket(httpServer, { origin: allowedOrigins as any, credentials: true });

httpServer.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});