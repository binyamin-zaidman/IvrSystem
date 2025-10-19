import express from "express";
import bodyParser from "body-parser";
import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/.env" });

import authRoutes from "./Routes/Api/auth";
import userRoutes from "./Routes/Api/users";
import tripRoutes from "./Routes/Api/trips";
import paymentRoutes from "./Routes/Api/payments";
import gtfsRoutes from "./Routes/Api/gtfs";
import ivrRoutes from "./Routes/Ivr/ivrRoutes";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Logging middleware
app.use((req, res, next) => {
  console.log("============================================================");
  console.log("📞 בקשה חדשה!");
  console.log(`זמן: ${new Date().toLocaleString("he-IL")}`);
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.url}`);
  console.log("Headers:", req.headers);
  console.log("Query:", req.query);
  console.log("Body:", req.body);
  console.log("============================================================");
  next();
});

// API routes
app.get("/", (req, res) => res.send("Hello World!"));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/gtfs", gtfsRoutes);
app.use("/api/payments", paymentRoutes);

// IVR routes
app.use("/ivr", ivrRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("❌ Server Error:", err);
  res.status(500).json({ error: "Internal server error" });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚍 Server running on port ${PORT}`);
});


