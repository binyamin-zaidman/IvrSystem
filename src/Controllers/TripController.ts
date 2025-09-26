import { Request, Response } from "express";
import { TripService } from "../Services/TripService";

export class TripController {
  static async createTrip(req: Request, res: Response) {
    try {
      const tripRequest = req.body;
      if (!tripRequest) {
        return res.status(400).json({ message: "tripRequest is required" });
      }

      const trip = await TripService.createTrip(tripRequest);
      if (trip.length === 0) {
        return res.status(404).json({ message: "No trip found" });

      }
      res.json({ trip });
    } catch (err: any) {
      res.status(500).json({ message: "createTrip not implemented yet" });
    }
  }

  static async getUserTrips(req: Request, res: Response) {
    res.json({ message: "getUserTrips not implemented yet" });
  }
}
