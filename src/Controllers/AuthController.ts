import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { AuthService } from "../Services/AuthService";

export class AuthController {
  static async register(req: Request, res: Response) {
    const user = req.body;
    const passwordHash = await bcrypt.hash(user.password, 10);
    try {
      user.password = passwordHash;
      const userRegistered = await AuthService.registerUser(user)
      res.status(201).json({ message: "User registered successfully", user: userRegistered });
      return userRegistered;
    } catch (error) {
      res.status(404).json({ message: "Error registering user", error });
      return;
    } 
  }

  static async login(req: Request, res: Response) {
    res.json({ message: "login not implemented yet" });
  }

  static async logout(req: Request, res: Response) {
    res.json({ message: "logout not implemented yet" });
  }
}

export const { register, login, logout } = AuthController;
