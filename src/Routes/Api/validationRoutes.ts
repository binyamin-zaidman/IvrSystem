
import express from "express";
import { ValidationController } from "../../Controllers/ValidationController";

const router = express.Router();

// אימות נסיעה לפי קוד
router.post("/verify", ValidationController.verifyRide);

// קבלת נסיעה פעילה לפי טלפון
router.get("/active/:phone", ValidationController.getActiveRideByPhone);

// רישום אימות על ידי מבקר
router.post("/confirm", ValidationController.confirmValidation);

// היסטוריה ואימותים של מבקר
router.get("/inspector/:inspectorId/history", ValidationController.getInspectorHistory);
router.get("/inspector/:inspectorId/stats", ValidationController.getInspectorStats);

export default router;