require("dotenv").config();

const express = require("express");
const cors = require("cors");
const dashboardRoutes = require("./routes/dashboard");
const deviceRoutes = require("./routes/devices");
const failureRoutes = require("./routes/failures");
const maintenanceRoutes = require("./routes/maintenance");
const logRoutes = require("./routes/logs");
const { testMySQLConnection } = require("./config/mysql");
const { testMongoConnection } = require("./config/mongodb");

const app = express();
const PORT = Number(process.env.PORT || 5000);

// global middlewares
app.use(cors());
app.use(express.json());

// runtime check
app.get("/health", (req, res) => {
  res.json({ success: true, message: "Server is running" });
});

// feature routes
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/failures", failureRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/logs", logRoutes);

async function startServer() {
  try {
    // verify DB connection before accepting request
    await testMySQLConnection();
    console.log("MySQL connected");
    await testMongoConnection();
    console.log("MongoDB connected");

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
