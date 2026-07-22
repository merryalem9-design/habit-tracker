import "dotenv/config";
import express from "express";
import { createServer } from "http";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes";
import habitRoutes from "./routes/habitRoutes";
import checkInRoutes from "./routes/checkInRoutes";
import statsRoutes from "./routes/statsRoutes";
import groupRoutes from "./routes/groupRoutes";
import postRoutes from "./routes/postRoutes";
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

app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan("dev"));

app.use("/api/auth", authRoutes);
app.use("/api/habits", habitRoutes);
app.use("/api/checkins", checkInRoutes);
app.use("/api", statsRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/posts", postRoutes);

app.get("/", (req, res) => {
  res.json({ status: "Habit tracker API is running" });
});

initSocket(httpServer, corsOptions); // pass the same options to Socket.io

httpServer.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});