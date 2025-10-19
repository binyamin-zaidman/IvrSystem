import { Request, Response } from "express";
import { IVRService } from "../Services/IVRService";

export class IVRController {
  /**
   * פונקציה כללית לטיפול בכל שלבי השיחה
   * Route: POST /ivr/webhook/handleAll
   */
  static async handleAll(req: Request, res: Response) {
    console.log("📲 Incoming IVR request:", JSON.stringify(req.body, null, 2));
    
    try {
      const { ApiPhone, ApiDtmf, hangup, LINE, DIRECTION, AGENCY, BOARDING, ALIGHTING } = req.body;
      
      // ניתוק שיחה
      if (hangup === "yes") {
        IVRService.handleHangup(ApiPhone);
        return res.status(200).send("ok");
      }
      
      // בדיקה שיש טלפון
      if (!ApiPhone) {
        console.error("❌ No phone number");
        return res.status(200)
          .set("Content-Type", "text/plain; charset=utf-8")
          .send("id_list_message=t-שגיאה במערכת\nhangup=yes");
      }
      
      const session = IVRService.getOrCreateSession(ApiPhone);
      console.log(`📊 Session: ${ApiPhone}, Step: ${session.step}`);
      console.log(`📥 Received - LINE: ${LINE || 'none'}, DIRECTION: ${DIRECTION || 'none'}, AGENCY: ${AGENCY || 'none'}, BOARDING: ${BOARDING || 'none'}, ALIGHTING: ${ALIGHTING || 'none'}`);
      console.log("------------------------------------------");

      let response: string;

      // טיפול לפי השלב הנוכחי (ולא לפי הפרמטרים!)
      switch (session.step) {
        case "START":
        case "SELECT_LINE":
          if (LINE) {
            console.log(`✅ Handling LINE selection: ${LINE}`);
            response = await IVRService.handleLineSelection(ApiPhone, LINE);
          } else {
            response = await IVRService.handleStart(ApiPhone);
          }
          break;

        case "SELECT_AGENCY":
          if (AGENCY) {
            console.log(`✅ Handling AGENCY selection: ${AGENCY}`);
            response = await IVRService.handleAgencySelection(ApiPhone, AGENCY);
          } else {
            response = "id_list_message=t-לא התקבלה בחירה. אנא בחר חברה\nhangup=yes";
          }
          break;

        case "SELECT_DIRECTION":
          if (DIRECTION) {
            console.log(`✅ Handling DIRECTION selection: ${DIRECTION}`);
            // DIRECTION מגיע כמערך, לוקחים את הערך הראשון
            const directionValue = Array.isArray(DIRECTION) ? DIRECTION[0] : DIRECTION;
            response = await IVRService.handleDirectionSelection(ApiPhone, directionValue);
          } else {
            response = "id_list_message=t-לא התקבלה בחירה. אנא בחר כיוון\nhangup=yes";
          }
          break;

        case "SELECT_BOARDING":
          if (BOARDING) {
            console.log(`✅ Handling BOARDING selection: ${BOARDING}`);
            response = await IVRService.handleBoardingStopSelection(ApiPhone, BOARDING);
          } else {
            response = "id_list_message=t-לא התקבלה בחירה. אנא בחר תחנת עלייה\nhangup=yes";
          }
          break;

        case "SELECT_ALIGHTING":
          if (ALIGHTING) {
            console.log(`✅ Handling ALIGHTING selection: ${ALIGHTING}`);
            response = await IVRService.handleAlightingStopSelection(ApiPhone, ALIGHTING, ApiPhone);
          } else {
            response = "id_list_message=t-לא התקבלה בחירה. אנא בחר תחנת ירידה\nhangup=yes";
          }
          break;

        default:
          console.log(`⚠️ Unknown step: ${session.step}, restarting`);
          response = await IVRService.handleStart(ApiPhone);
      }

      console.log(`📤 Response (${response.length} chars):\n${response}`);
      console.log("============================================================");

      res.status(200)
        .set("Content-Type", "text/plain; charset=utf-8")
        .send(response);

    } catch (error) {
      console.error("❌ Error in IVR handler:", error);
      res.status(200)
        .set("Content-Type", "text/plain; charset=utf-8")
        .send("id_list_message=t-אירעה שגיאה במערכת\nhangup=yes");
    }
  }
}