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

// Only allow requests from your actual frontend, not from anywhere
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
};

app.use(cors({
  origin: [
    'http://localhost:5173', 
    'https://habit-tracker-mqbc-puce.vercel.app' 
  ]
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

initSocket(httpServer, corsOptions); // pass the same options to Socket.io

httpServer.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});