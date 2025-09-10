import { Router } from "express";
import {
  startRide,
  getLastConfirmation,
  getLineBusInfo,
} 
from "../controllers/ridesController";
// import {
//   askRoute,
//   askDirection,
//   askStops,
//   confirmRide,
// } from "../Services/RideFlowService";

const router = Router();

router.post("/lineBusInfo", getLineBusInfo);
// התחלת נסיעה רגילה
router.post("/start", startRide);

// קבלת הקוד האחרון
router.get("/confirmation/:phone", getLastConfirmation);

// // Endpoint לזרימת השאלות
// router.post("/ride-step", async (req, res) => {
//   const { step, answer, phoneNumber } = req.body as {
//     step: string;
//     answer: string;
//     phoneNumber: string;
//   };

//   try {
//     let result;
//     switch (step) {
//       case "askRoute":
//         result = await askRoute(answer);
//         break;
//       case "askDirection":
//         result = await askDirection(answer); // כאן answer זה routeId
//         break;
//       case "askStops":
//         const { routeId, directionId } = req.body;
//         result = await askStops(routeId, directionId);
//         break;
//       case "confirmRide":
//         const { userId, routeId: rId, directionId: dirId, fromStopId, toStopId } = req.body;
//         result = await confirmRide(userId, rId, dirId, fromStopId, toStopId);
//         break;
//       default:
//         return res.status(400).json({ message: "Invalid step" });
//     }

//     return res.json(result);
//   } catch (err: any) {
//     return res.status(500).json({ message: err.message });
//   }
// });

export default router;