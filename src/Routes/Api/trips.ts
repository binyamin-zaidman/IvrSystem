import { Router } from "express";
import { TripController } from "../../Controllers/TripController";
import { PaymentController } from "../../Controllers/PaymentController";



const router = Router();

router.post("/createTrip", TripController.createTrip);
router.get("/", TripController.getUserTrips);

export default router;
