const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { connectDB } = require("./config/db");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const employeeRoutes = require("./routes/employees");
const leaveRoutes = require("./routes/leaves");
const hrRoutes = require("./routes/hr");
const managerRoutes = require("./routes/manager");
const employeePortalRoutes = require("./routes/employeePortal");
const reportRoutes = require("./routes/reports");
const { loginLimiter, apiLimiter } = require("./middleware/rateLimiter");
const helmet = require("helmet");

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));
app.options("*", cors());
app.use(express.json());
app.use("/api", apiLimiter);
app.use("/api/auth/login", loginLimiter);
app.use(helmet());

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/hr", hrRoutes);
app.use("/api/manager", managerRoutes);
app.use("/api/portal", employeePortalRoutes);
app.use("/api/reports", reportRoutes);

app.get("/api/health", (req, res) => {
  res.json({ message: "EMS API is running 🚀" });
});

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const PORT = process.env.PORT || 5000;
const start = async () => {
  await connectDB();
  app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
};
start();