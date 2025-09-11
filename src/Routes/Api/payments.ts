import { Router } from "express";
import { PaymentController } from "../../Controllers/PaymentController";

const router = Router();

router.post("/", PaymentController.makePayment);
router.get("/", PaymentController.getUserPayments);

export default router;
