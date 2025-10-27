import { Request, Response } from "express";
import { IVRService } from "../Services/IVRService";

export class IVRController {
  static async handleAll(req: Request, res: Response) {
    console.log("📲 Incoming IVR request:", JSON.stringify(req.body, null, 2));

    try {
      const { ApiPhone, hangup } = req.body;

      if (hangup === "yes") {
        IVRService.handleHangup(ApiPhone);
        return res.status(200).send("ok");
      }

      if (!ApiPhone) {
        console.error("❌ No phone number");
        return res
          .status(200)
          .set("Content-Type", "text/plain; charset=utf-8")
          .send("id_list_message=t-שגיאה במערכת\nhangup=yes");
      }

      const session = IVRService.getOrCreateSession(ApiPhone);

      // ✅ הגנה מפני מערכים חשודים (סימן ללולאה)
      const suspiciousArrays = Object.entries(req.body).filter(
        ([key, value]) => Array.isArray(value) && value.length > 10
      );

      if (suspiciousArrays.length > 0) {
        console.error(
          `❌ Detected suspicious arrays in request:`,
          suspiciousArrays.map(
            ([key, value]) => `${key}: ${(value as any[]).length} items`
          )
        );

        // איפוס הסשן ובקשה להתחיל מחדש
        IVRService.clearSession(ApiPhone);
        return res
          .status(200)
          .set("Content-Type", "text/plain; charset=utf-8")
          .send(
            "id_list_message=t-אירעה שגיאה במערכת נא להתקשר שוב\nhangup=yes"
          );
      }
      console.log(`📊 Session: ${ApiPhone}, Step: ${session.step}`);
      console.log(`📥 Received body:`, req.body);
      console.log("------------------------------------------");

      let response: string;

      switch (session.step) {
        case "START":
        case "SELECT_LINE":
          const { LINE } = req.body;
          if (LINE) {
            console.log(`✅ Handling LINE selection: ${LINE}`);
            response = await IVRService.handleLineSelection(ApiPhone, LINE);
          } else {
            response = await IVRService.handleStart(ApiPhone);
          }
          break;

        case "SELECT_TRANSPORT_TYPE":
          const { TRANSPORT_TYPE } = req.body;
          if (TRANSPORT_TYPE) {
            console.log(
              `✅ Handling TRANSPORT_TYPE selection: ${TRANSPORT_TYPE}`
            );
            response = await IVRService.handleTransportTypeSelection(
              ApiPhone,
              TRANSPORT_TYPE
            );
          } else {
            response = await IVRService.handleStart(ApiPhone);
          }
          break;

        case "SELECT_TRAIN_ORIGIN":
          const { TRAIN_REGION_ORIGIN, TRAIN_ORIGIN } = req.body;

          // ✅ סדר חשוב! בדוק תחילה אם יש בחירת תחנה (TRAIN_ORIGIN)
          // כי TRAIN_REGION_ORIGIN נשאר ב-body גם אחרי שבחרנו אזור
          if (TRAIN_ORIGIN) {
            // שלב 2: משתמש בחר תחנת מוצא
            console.log(`✅ Handling TRAIN_ORIGIN selection: ${TRAIN_ORIGIN}`);
            response = await IVRService.handleTrainOriginSelection(
              ApiPhone,
              TRAIN_ORIGIN
            );
          } else if (TRAIN_REGION_ORIGIN) {
            // שלב 1: משתמש בחר אזור מוצא
            console.log(
              `✅ Handling TRAIN_REGION_ORIGIN: ${TRAIN_REGION_ORIGIN}`
            );
            response = await IVRService.handleTrainOriginRegionSelection(
              ApiPhone,
              TRAIN_REGION_ORIGIN
            );
          } else {
            // אין קלט - בדוק מה להציג
            if (!session.trainRegion) {
              // אין אזור שמור - הצג רשימת אזורים
              response = IVRService.getTrainRegionsList(ApiPhone, "origin");
            } else {
              // יש אזור שמור - הצג רשימת תחנות באזור
              response = await IVRService.getTrainStationsByRegion(
                ApiPhone,
                session.trainRegion,
                "origin"
              );
            }
          }
          break;

        // רכבת - בחירת אזור יעד
        case "SELECT_TRAIN_DEST_REGION":
          const { TRAIN_REGION_DEST } = req.body;
          if (TRAIN_REGION_DEST) {
            console.log(`✅ Handling TRAIN_REGION_DEST: ${TRAIN_REGION_DEST}`);
            response = await IVRService.handleTrainDestRegionSelection(
              ApiPhone,
              TRAIN_REGION_DEST
            );
          } else {
            response = IVRService.getTrainRegionsList(ApiPhone, "destination");
          }
          break;

        // רכבת - תחנת יעד
        case "SELECT_TRAIN_DESTINATION":
          const { TRAIN_DESTINATION } = req.body;

          // ✅ בדוק תחילה אם יש בחירת תחנת יעד
          if (TRAIN_DESTINATION) {
            console.log(
              `✅ Handling TRAIN_DESTINATION selection: ${TRAIN_DESTINATION}`
            );
            response = await IVRService.handleTrainDestinationSelection(
              ApiPhone,
              TRAIN_DESTINATION
            );
          } else {
            // אין קלט - הצג תחנות באזור היעד
            const destRegion = session.trainDestRegion;
            if (!destRegion) {
              response = "id_list_message=t-אירעה שגיאה\nhangup=yes";
            } else {
              response = await IVRService.getTrainStationsByRegion(
                ApiPhone,
                destRegion,
                "destination"
              );
            }
          }
          break;
        // אוטובוס - בחירת חברה
        case "SELECT_AGENCY":
          const { AGENCY, SELECT_AGENCY } = req.body;
          const agencyValue = AGENCY || SELECT_AGENCY;

          if (agencyValue) {
            console.log(`✅ Handling AGENCY selection: ${agencyValue}`);
            response = await IVRService.handleAgencySelection(
              ApiPhone,
              agencyValue
            );
          } else {
            console.error(`❌ No AGENCY value received. Body:`, req.body);
            response =
              "id_list_message=t-לא התקבלה בחירה. אנא בחר חברה\nhangup=yes";
          }
          break;

        // אוטובוס - בחירת כיוון
        case "SELECT_DIRECTION":
          const { DIRECTION } = req.body;
          if (DIRECTION) {
            console.log(`✅ Handling DIRECTION selection: ${DIRECTION}`);
            const directionValue = Array.isArray(DIRECTION)
              ? DIRECTION[0]
              : DIRECTION;
            response = await IVRService.handleDirectionSelection(
              ApiPhone,
              directionValue
            );
          } else {
            response =
              "id_list_message=t-לא התקבלה בחירה. אנא בחר כיוון\nhangup=yes";
          }
          break;

        // בחירת שיטת הזנת תחנות
        case "SELECT_STOP_METHOD":
          const { STOP_METHOD } = req.body;
          if (STOP_METHOD) {
            console.log(`✅ Handling STOP_METHOD selection: ${STOP_METHOD}`);
            response = await IVRService.handleStopMethodSelection(
              ApiPhone,
              STOP_METHOD
            );
          } else {
            response = "id_list_message=t-לא התקבלה בחירה\nhangup=yes";
          }
          break;

        // הקשת מספר תחנת עלייה
        case "ENTER_BOARDING_CODE":
          const { BOARDING_CODE } = req.body;
          if (BOARDING_CODE) {
            console.log(`✅ Handling BOARDING_CODE entry: ${BOARDING_CODE}`);
            response = await IVRService.handleBoardingCodeEntry(
              ApiPhone,
              BOARDING_CODE
            );
          } else {
            response = "id_list_message=t-לא הוקש מספר תחנה\nhangup=yes";
          }
          break;

        // הקשת מספר תחנת ירידה
        case "ENTER_ALIGHTING_CODE":
          const { ALIGHTING_CODE } = req.body;
          if (ALIGHTING_CODE) {
            console.log(`✅ Handling ALIGHTING_CODE entry: ${ALIGHTING_CODE}`);
            response = await IVRService.handleAlightingCodeEntry(
              ApiPhone,
              ALIGHTING_CODE
            );
          } else {
            response = "id_list_message=t-לא הוקש מספר תחנה\nhangup=yes";
          }
          break;

        default:
          console.log(`⚠️ Unknown step: ${session.step}, restarting`);
          response = await IVRService.handleStart(ApiPhone);
      }

      console.log(`📤 Response (${response.length} chars):\n${response}`);
      console.log(
        "============================================================"
      );

      res
        .status(200)
        .set("Content-Type", "text/plain; charset=utf-8")
        .send(response);
    } catch (error) {
      console.error("❌ Error in IVR handler:", error);
      res
        .status(200)
        .set("Content-Type", "text/plain; charset=utf-8")
        .send("id_list_message=t-אירעה שגיאה במערכת\nhangup=yes");
    }
  }
}
