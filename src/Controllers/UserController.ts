import { Request, Response } from "express";

export class UserController {
  static async getProfile(req: Request, res: Response) {
    res.json({ message: "getProfile not implemented yet" });
  }

  static async updateProfile(req: Request, res: Response) {
    res.json({ message: "updateProfile not implemented yet" });
  }
}
