import { Request, Response } from "express";

export class GTFSController {
  static async getLineBusAgencies(req: Request, res: Response) {
    // TODO: קוד שיחזיר את רשימת החברות עבור קו
    res.json({ message: "getLineBusAgencies not implemented yet" });
  }

  static async getDirectionsByAgency(req: Request, res: Response) {
    // TODO: קוד שיחזיר את הכיוונים לפי קו + חברה
    res.json({ message: "getDirectionsByAgency not implemented yet" });
  }
}
