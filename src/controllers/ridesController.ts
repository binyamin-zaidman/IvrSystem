import { Request, Response } from "express";
import { users } from "./usersController"; 

export const startRide = (req: Request, res: Response) => {
  const { phoneNumber, lineNumber } = req.body as { phoneNumber?: string; lineNumber?: string | number };
  if (!phoneNumber || !lineNumber) {
    return res.status(400).json({ message: "phoneNumber and lineNumber required" });
  }

  const user = users.find(u => u.phoneNumber === phoneNumber);
  if (!user) return res.status(400).json({ message: "User not found" });

  const confirmationCode = Math.floor(10000 + Math.random() * 90000);
  const ride = { lineNumber, startTime: new Date().toISOString(), confirmationCode };
  user.rides.push(ride);

  return res.json({ confirmationCode });
};

export const getLastConfirmation = (req: Request, res: Response) => {
  const phone = String(req.params.phone || "");
  if (!phone) return res.status(400).json({ message: "phone required" });

  const user = users.find(u => u.phoneNumber === phone);
  if (!user || user.rides.length === 0) {
    return res.status(404).json({ message: "No rides found" });
  }
  const lastRide = user.rides[user.rides.length - 1];
  return res.json({ confirmationCode: lastRide.confirmationCode });
};
