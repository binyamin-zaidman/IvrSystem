import { Router } from "express";
import { startRide, getLastConfirmation } from "../Controllers/ridesController";

const router = Router();

router.post("/start", startRide);
router.get("/confirmation/:phone", getLastConfirmation);

export default router;
