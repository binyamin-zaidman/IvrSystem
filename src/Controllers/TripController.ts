import { Request, Response } from "express";

export class TripController {
  static async createTrip(req: Request, res: Response) {
    res.json({ message: "createTrip not implemented yet" });
  }

  static async getUserTrips(req: Request, res: Response) {
    res.json({ message: "getUserTrips not implemented yet" });
  }
}
