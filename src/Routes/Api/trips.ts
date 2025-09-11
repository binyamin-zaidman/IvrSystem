import { Router } from "express";
import { TripController } from "../../Controllers/TripController";

const router = Router();

router.post("/", TripController.createTrip);
router.get("/", TripController.getUserTrips);

export default router;
