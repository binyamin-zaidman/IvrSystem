import express from "express";
import bodyParser from "body-parser";

import authRoutes from "./Routes/Api/auth";
import userRoutes from "./Routes/Api/users";
import tripRoutes from "./Routes/Api/trips";
import paymentRoutes from "./Routes/Api/payments";
import gtfsRoutes from "./Routes/Api/gtfs";
import ivrWebhook from "./Routes/Ivr/webhook";

const app = express();
app.use(bodyParser.json());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/gtfs", gtfsRoutes);

// IVR routes
app.use("/ivr/webhook", ivrWebhook);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚍 Server running on port ${PORT}`);
});


