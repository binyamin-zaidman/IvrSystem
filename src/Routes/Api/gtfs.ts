import { Router } from "express";
import { GTFSController } from "../../Controllers/GTFSController";

const router = Router();

// שלב 1: החזרת רשימת חברות לפי קו
router.post("/lineBusAgencies", GTFSController.getLineBusAgencies);

// שלב 2: החזרת כיוונים לפי קו + חברה
router.post("/directions", GTFSController.getDirectionsByAgency);


// שלב 3: החזרת תחנות לפי קו + חברה + כיוון
router.post("/stops", GTFSController.getStopsForRoute);

export default router;
