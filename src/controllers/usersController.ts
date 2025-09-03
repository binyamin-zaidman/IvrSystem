import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Request, Response } from "express";

export interface Ride {
  lineNumber: string | number;
  startTime: string;
  confirmationCode: number;
}

export interface User {
  username?: string;
  email?: string;
  phoneNumber: string;
  passwordHash: string;
  rides: Ride[];
}

// יצוא המשתמשים כדי שרכיבים אחרים (ridesController) יוכלו לגשת
export const users: User[] = [];

export const registerUser = (req: Request, res: Response) => {
  const { phoneNumber, username, email,password } = req.body as {
    phoneNumber?: string;
    username?: string;
    password?: string;
    email?: string;
  };
  if (!phoneNumber || !password) {
    return res
      .status(400)
      .json({ message: "phoneNumber and password required" });
  }

  const exists = users.find((u) => u.phoneNumber === phoneNumber);
  if (exists) {
    return res.status(400).json({ message: "User already exists" });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  users.push({ phoneNumber, username, email, passwordHash, rides: [] });
  return res.json({ message: "User registered successfully" });
};

export const loginUser = (req: Request, res: Response) => {
  const { phoneNumber, password } = req.body as {
    phoneNumber?: string;
    password?: string;
  };
  if (!phoneNumber || !password) {
    return res
      .status(400)
      .json({ message: "phoneNumber and password required" });
  }

  const user = users.find((u) => u.phoneNumber === phoneNumber);
  if (!user) return res.status(400).json({ message: "User not found" });

  const ok = bcrypt.compareSync(password, user.passwordHash);
  if (!ok) return res.status(400).json({ message: "Invalid password" });

  const secret = process.env.JWT_SECRET ?? "dev-secret";
  const token = jwt.sign({ phoneNumber }, secret, { expiresIn: "1h" });
  return res.json({ token });
};
