import { Router } from "express";
import { IVRController } from "../../Controllers/IVRController";

const router = Router();

// אופציה 1: נתיבים נפרדים לכל שלב
router.post("/webhook/handleAll", IVRController.handleAll);
// router.post("/webhook/start", IVRController.start);
// router.post("/webhook/line", IVRController.selectLine);
// router.post("/webhook/agency", IVRController.selectAgency);
// router.post("/webhook/direction", IVRController.selectDirection);
// router.post("/webhook/boarding", IVRController.selectBoardingStop);
// router.post("/webhook/alighting", IVRController.selectAlightingStop);


export default router;