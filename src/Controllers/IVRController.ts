import { Request, Response } from "express";

export class IVRController {
  static async webhook(req: Request, res: Response) {
    res.json({ message: "IVR webhook not implemented yet" });
  }
}
