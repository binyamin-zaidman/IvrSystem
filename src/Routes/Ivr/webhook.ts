import express, { Router } from "express";
import { IVRController } from "../../Controllers/IVRController";

const router = Router();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));
console.log("IVR Webhook route initialized");
router.post("/start", IVRController.webhook);
router.get("/start", IVRController.webhook);
export default router;
