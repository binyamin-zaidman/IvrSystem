import { Router } from "express";
import { IVRController } from "../../Controllers/IVRController";

const router = Router();

router.post("/", IVRController.webhook);

export default router;
