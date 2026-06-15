require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const path    = require("path");

const { connectMongoDB } = require("./config/mongodb");

// Route imports
const logsRouter        = require("./routes/logs");
const devicesRouter     = require("./routes/devices");
const failuresRouter    = require("./routes/failures");
const maintenanceRouter = require("./routes/maintenance");
const dashboardRouter   = require("./routes/dashboard");

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

// ─── Routes ─────────────────────────────────────────────────
app.use("/api/logs",        logsRouter);
app.use("/api/devices",     devicesRouter);
app.use("/api/failures",    failuresRouter);
app.use("/api/maintenance", maintenanceRouter);
app.use("/api/dashboard",   dashboardRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Catch-all: serve frontend for SPA navigation
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// ─── Startup ─────────────────────────────────────────────────
async function start() {
  try {
    await connectMongoDB();
    app.listen(PORT, () => {
      console.log(`[Server] MedTrack running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("[Server] Failed to start:", err.message);
    process.exit(1);
  }
}

start();
