require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const path    = require("path");

const { connectMongoDB } = require("./config/mongodb");
const { authenticate } = require("./middleware/auth");

// Route imports
const authRouter        = require("./routes/auth");
const logsRouter        = require("./routes/logs");
const devicesRouter     = require("./routes/devices");
const failuresRouter    = require("./routes/failures");
const maintenanceRouter = require("./routes/maintenance");
const dashboardRouter   = require("./routes/dashboard");
const olapRouter        = require("./routes/olap");

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

// ─── Routes ─────────────────────────────────────────────────
// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api", authenticate);
app.use("/api/logs",        logsRouter);
app.use("/api/devices",     devicesRouter);
app.use("/api/failures",    failuresRouter);
app.use("/api/maintenance", maintenanceRouter);
app.use("/api/dashboard",   dashboardRouter);
app.use("/api/olap",        olapRouter);

// Catch-all: serve frontend for SPA navigation
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// ─── Startup ─────────────────────────────────────────────────
async function start() {
  if (!process.env.JWT_SECRET) {
    console.warn("[Server] JWT_SECRET is not set; using the local development fallback. Add it to backend/.env before deployment.");
  }

  try {
    await connectMongoDB();
  } catch (mongoError) {
    console.warn(`[MongoDB] Not connected: ${mongoError.message}`);
    console.warn("[MongoDB] SQL dashboards and OLAP routes will still be available.");
  }

  app.listen(PORT, () => {
    console.log(`[Server] MedTrack running at http://localhost:${PORT}`);
  });
}

start();
