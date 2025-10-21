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
      const { ApiPhone, hangup } = req.body;

      // ניתוק שיחה
      if (hangup === "yes") {
        IVRService.handleHangup(ApiPhone);
        return res.status(200).send("ok");
      }

      // בדיקה שיש טלפון
      if (!ApiPhone) {
        console.error("❌ No phone number");
        return res
          .status(200)
          .set("Content-Type", "text/plain; charset=utf-8")
          .send("id_list_message=t-שגיאה במערכת\nhangup=yes");
      }

      const session = IVRService.getOrCreateSession(ApiPhone);
      console.log(`📊 Session: ${ApiPhone}, Step: ${session.step}`);
      console.log(`📥 Received body:`, req.body);
      console.log("------------------------------------------");

      let response: string;

      // טיפול לפי השלב הנוכחי
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
          const { TRAIN_ORIGIN } = req.body;
          if (TRAIN_ORIGIN) {
            console.log(`✅ Handling TRAIN_ORIGIN selection: ${TRAIN_ORIGIN}`);
            response = await IVRService.handleTrainOriginSelection(
              ApiPhone,
              TRAIN_ORIGIN
            );
          } else {
            response = await IVRService.getTrainStationsList(
              ApiPhone,
              "origin"
            );
          }
          break;

        case "SELECT_TRAIN_DESTINATION":
          const { TRAIN_DESTINATION } = req.body;
          if (TRAIN_DESTINATION) {
            console.log(
              `✅ Handling TRAIN_DESTINATION selection: ${TRAIN_DESTINATION}`
            );
            response = await IVRService.handleTrainDestinationSelection(
              ApiPhone,
              TRAIN_DESTINATION
            );
          } else {
            response = await IVRService.getTrainStationsList(
              ApiPhone,
              "destination"
            );
          }
          break;

        case "SELECT_AGENCY":
          const { AGENCY } = req.body;
          if (AGENCY) {
            console.log(`✅ Handling AGENCY selection: ${AGENCY}`);
            response = await IVRService.handleAgencySelection(ApiPhone, AGENCY);
          } else {
            response =
              "id_list_message=t-לא התקבלה בחירה. אנא בחר חברה\nhangup=yes";
          }
          break;

        case "SELECT_DIRECTION":
          const { DIRECTION } = req.body;
          if (DIRECTION) {
            console.log(`✅ Handling DIRECTION selection: ${DIRECTION}`);
            // DIRECTION מגיע כמערך, לוקחים את הערך הראשון
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

        case "SELECT_BOARDING":
          const { BOARDING } = req.body;
          if (BOARDING) {
            console.log(`✅ Handling BOARDING selection: ${BOARDING}`);
            response = await IVRService.handleBoardingStopSelection(
              ApiPhone,
              BOARDING
            );
          } else {
            response =
              "id_list_message=t-לא התקבלה בחירה. אנא בחר תחנת עלייה\nhangup=yes";
          }
          break;

        case "SELECT_ALIGHTING":
          const { ALIGHTING } = req.body;
          if (ALIGHTING) {
            console.log(`✅ Handling ALIGHTING selection: ${ALIGHTING}`);
            response = await IVRService.handleAlightingStopSelection(
              ApiPhone,
              ALIGHTING,
              ApiPhone
            );
          } else {
            response =
              "id_list_message=t-לא התקבלה בחירה. אנא בחר תחנת ירידה\nhangup=yes";
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
