import { Request, Response } from "express";
import { IVRService } from "../Services/try";

export class IVRController {
  static async handleAll(req: Request, res: Response) {
    try {
      const { ApiPhone } = req.body;

      console.log("📞 IVR Request received:", {
        phone: ApiPhone,
        body: req.body
      });

      if (!ApiPhone) {
        return res
          .status(200)
          .set("Content-Type", "text/plain; charset=utf-8")
          .send("id_list_message=t-שגיאה במערכת\nhangup=yes");
      }
      if(req.body.hangup === "yes"){
        console.log(`📴 Call ended by user: ${ApiPhone}, clearing session`);
        IVRService.clearSession(ApiPhone);
        return res
          .status(200)
          .set("Content-Type", "text/plain; charset=utf-8")
          .send("id_list_message=t-השיחה מסתיימת תודה\nhangup=yes");
      }

      // הגנה מפני מערכים חשודים
      const suspiciousArrays = Object.entries(req.body).filter(
        ([, value]) => Array.isArray(value) && value.length > 5
      );
      
      if (suspiciousArrays.length > 0) {
        console.warn("⚠️ Suspicious arrays detected, clearing session");
        IVRService.clearSession(ApiPhone);
        return res
          .status(200)
          .set("Content-Type", "text/plain; charset=utf-8")
          .send("id_list_message=t-יש מערך של נתונים \nhangup=yes");
      }

      // קבל session קיים
      const session = IVRService.getOrCreateSession(ApiPhone);
      console.log(`📊 Current session step: ${session.step}`);

      // ✅ נחלץ הקלט המתאים לפי שלב CURRENT
      let input: string | string[] | undefined;
    
      switch (session.step) {
        case "START":
          // אין קלט בהתחלה
          input = undefined;
          break;

        case "SELECT_TRANSPORT_TYPE":
          input = req.body.TRANSPORT_TYPE;
          console.log("📥 TRANSPORT_TYPE input:", input);
          break;

        case "SELECT_LINE":
          input = req.body.LINE;
          console.log("📥 LINE input:", input);
          break;

        case "SELECT_AGENCY":
          input = req.body.AGENCY;
          console.log("📥 AGENCY input:", input);
          break;

        case "SELECT_DIRECTION":
          input = req.body.DIRECTION;
          console.log("📥 DIRECTION input:", input);
          break;

        case "SELECT_STOP_METHOD":
          input = req.body.STOP_METHOD;
          console.log("📥 STOP_METHOD input:", input);
          break;

        case "ENTER_BOARDING_CODE":
          input = req.body.BOARDING_CODE;
          console.log("📥 BOARDING_CODE input:", input);
          break;

        case "ENTER_ALIGHTING_CODE":
          input = req.body.ALIGHTING_CODE;
          console.log("📥 ALIGHTING_CODE input:", input);
          break;

        case "SELECT_TRAIN_ORIGIN":
          // ✅ בשלב זה אנחנו מצפים לבחירת אזור
          input = req.body.TRAIN_REGION_ORIGIN;
          console.log("📥 TRAIN_REGION_ORIGIN input:", input);
          break;

        case "SELECT_TRAIN_ORIGIN_STOP":
          // ✅ כאן אנחנו מצפים לבחירת תחנה ספציפית
          input = req.body.TRAIN_ORIGIN;
          console.log("📥 TRAIN_ORIGIN input:", input);
          break;

        case "SELECT_TRAIN_DEST_REGION":
          input = req.body.TRAIN_REGION_DEST;
          console.log("📥 TRAIN_REGION_DEST input:", input);
          break;

        case "SELECT_TRAIN_DESTINATION":
          input = req.body.TRAIN_DESTINATION;
          console.log("📥 TRAIN_DESTINATION input:", input);
          break;

        default:
          console.warn(`⚠️ Unknown step: ${session.step}`);
          input = undefined;
      }

      // ✅ קריאה ל-FSM המרכזי
      const { nextStep } = await IVRService.handleInput(ApiPhone, input);

      console.log(`✅ Sending response (first 150 chars): ${nextStep.substring(0, 150)}...`);

      // שלח תגובה
      res
        .status(200)
        .set("Content-Type", "text/plain; charset=utf-8")
        .send(nextStep);

    } catch (error) {
      console.error("❌ Error in IVR handler:", error);
      res
        .status(200)
        .set("Content-Type", "text/plain; charset=utf-8")
        .send("id_list_message=t-אירעה שגיאה במערכת\nhangup=yes");
    }
  }

  /**
   * ✅ אופציונלי: endpoint לבדיקת session
   */
  static async getSession(req: Request, res: Response) {
    try {
      const { phone } = req.params;
      
      if (!phone) {
        return res.status(400).json({ error: "Phone number required" });
      }

      const session = IVRService.getOrCreateSession(phone);
      
      res.json({
        phone: session.phone,
        step: session.step,
        transportType: session.transportType,
        lineNumber: session.lineNumber,
        agencyName: session.agencyName
      });
    } catch (error) {
      console.error("Error getting session:", error);
      res.status(500).json({ error: "Failed to get session" });
    }
  }

  /**
   * ✅ אופציונלי: endpoint לניקוי session
   */
  static async clearSession(req: Request, res: Response) {
    try {
      const { phone } = req.params;
      
      if (!phone) {
        return res.status(400).json({ error: "Phone number required" });
      }

      IVRService.clearSession(phone);
      
      res.json({ 
        success: true, 
        message: `Session cleared for ${phone}` 
      });
    } catch (error) {
      console.error("Error clearing session:", error);
      res.status(500).json({ error: "Failed to clear session" });
    }
  }

  
}