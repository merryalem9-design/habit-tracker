"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const habitRoutes_1 = __importDefault(require("./routes/habitRoutes"));
const checkInRoutes_1 = __importDefault(require("./routes/checkInRoutes"));
const statsRoutes_1 = __importDefault(require("./routes/statsRoutes"));
const groupRoutes_1 = __importDefault(require("./routes/groupRoutes"));
const postRoutes_1 = __importDefault(require("./routes/postRoutes"));
const distractRoutes_1 = __importDefault(require("./routes/distractRoutes"));
const reportRoutes_1 = __importDefault(require("./routes/reportRoutes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const socket_1 = require("./socket");
const logger_1 = __importDefault(require("./lib/logger"));
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const PORT = process.env.PORT || 4000;
// Only allow requests from your actual frontend, not from anywhere
const corsOptions = {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use((0, morgan_1.default)("dev"));
app.use("/api/auth", authRoutes_1.default);
app.use("/api/users", userRoutes_1.default);
app.use("/api/habits", habitRoutes_1.default);
app.use("/api/checkins", checkInRoutes_1.default);
app.use("/api", statsRoutes_1.default);
app.use("/api/groups", groupRoutes_1.default);
app.use("/api/posts", postRoutes_1.default);
app.use("/api/distract-me", distractRoutes_1.default);
app.use("/api/reports", reportRoutes_1.default);
app.use("/api/chat", chatRoutes_1.default);
app.get("/", (req, res) => {
    res.json({ status: "Habit tracker API is running" });
});
(0, socket_1.initSocket)(httpServer, corsOptions); // pass the same options to Socket.io
httpServer.listen(PORT, () => {
    logger_1.default.info(`Server running on http://localhost:${PORT}`);
});
