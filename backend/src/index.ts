import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes";
import habitRoutes from "./routes/habitRoutes";
import checkInRoutes from "./routes/checkInRoutes";
import statsRoutes from "./routes/statsRoutes";
import logger from "./lib/logger";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));


app.use("/api/auth", authRoutes);
app.use("/api/habits", habitRoutes);
app.use("/api/checkins", checkInRoutes);
app.use("/api", statsRoutes);

app.get("/", (req, res) => {
  res.json({ status: "Habit tracker API is running" });
});

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});