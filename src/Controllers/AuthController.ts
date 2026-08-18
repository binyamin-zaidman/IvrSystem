import { Request, Response } from "express";

export class AuthController {
  static async register(req: Request, res: Response) {
    res.json({ message: "register not implemented yet" });
  }

  static async login(req: Request, res: Response) {
    res.json({ message: "login not implemented yet" });
  }

  static async logout(req: Request, res: Response) {
    res.json({ message: "logout not implemented yet" });
  }
}
