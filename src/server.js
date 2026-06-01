const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();
const { connectDB } = require("./config/db");
const { loginLimiter, apiLimiter } = require("./middleware/rateLimiter");

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const employeeRoutes = require("./routes/employees");
const leaveRoutes = require("./routes/leaves");
const hrRoutes = require("./routes/hr");
const managerRoutes = require("./routes/manager");
const employeePortalRoutes = require("./routes/employeePortal");
const reportRoutes = require("./routes/reports");

const app = express();

// ── CORS ──────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:5174",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

// ── MIDDLEWARE ────────────────────────────────────
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use("/api", apiLimiter);
app.use("/api/auth/login", loginLimiter);

// ── ROUTES ────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/hr", hrRoutes);
app.use("/api/manager", managerRoutes);
app.use("/api/portal", employeePortalRoutes);
app.use("/api/reports", reportRoutes);

// ── HEALTH CHECK ──────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ message: "EMS API is running 🚀" });
});

// ── 404 ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ── START ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const start = async () => {
  await connectDB();
  app.listen(PORT, () =>
    console.log(`🚀 Server running on http://localhost:${PORT}`)
  );
};
start();