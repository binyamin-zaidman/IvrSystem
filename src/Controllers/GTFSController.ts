import { Request, Response } from "express";
import { GTFSService } from "../Services/GTFSService";


export class GTFSController {
static async getLineBusAgencies(req: Request, res: Response) {
    try {
      const { lineBusInfo } = req.body;
      if (!lineBusInfo) {
        return res.status(400).json({ message: "lineBusInfo is required" });
      }

      const agencies = await GTFSService.getLineBusAgencies(lineBusInfo);

      if (agencies.length === 0) {
        return res.status(404).json({ message: "No agencies found for this line" });
      }

      res.json({ line: lineBusInfo, agencies });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }


  static async getDirectionsByAgency(req: Request, res: Response) { try {
    const { lineBusInfo, agencyId } = req.body;
    if (!lineBusInfo || !agencyId) {
      return res.status(400).json({ message: "lineBusInfo and agencyId are required" });
    }

    const directions = await GTFSService.getDirectionsByAgency(lineBusInfo, agencyId);

    if (directions.length === 0) {
      return res.status(404).json({ message: "No directions found for this line and agency" });
    }

    res.json({ line: lineBusInfo, agencyId, directions });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}
}
