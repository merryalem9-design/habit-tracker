import "dotenv/config"; // must be absolute first line — runs before any other import
import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.json({ status: "Habit tracker API is running" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});