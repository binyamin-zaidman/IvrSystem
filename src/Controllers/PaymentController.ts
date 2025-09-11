import { Request, Response } from "express";

export class PaymentController {
  static async makePayment(req: Request, res: Response) {
    res.json({ message: "makePayment not implemented yet" });
  }

  static async getUserPayments(req: Request, res: Response) {
    res.json({ message: "getUserPayments not implemented yet" });
  }
}
