import express from "express";

import authRoutes from "./Routes/Api/auth";
import userRoutes from "./Routes/Api/users";
import tripRoutes from "./Routes/Api/trips";
import paymentRoutes from "./Routes/Api/payments";
import gtfsRoutes from "./Routes/Api/gtfs";
import ivrRoutes from "./Routes/Ivr/ivrRoutes";

const app = express();
app.disable("x-powered-by");


app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});


// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/gtfs", gtfsRoutes);
app.use("/api/payments", paymentRoutes);
// IVR routes
app.use("/ivr", ivrRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled request error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

export default app;