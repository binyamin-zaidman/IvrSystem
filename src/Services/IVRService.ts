import { GTFSService } from "./GTFSService";
import { TripService } from "./TripService";
import { UserSession } from "../Models/IVR";

const sessions = new Map<string, UserSession>();

export class IVRService {
  static getOrCreateSession(phone: string): UserSession {
    if (!sessions.has(phone)) {
      sessions.set(phone, {
        phone,
        step: "START"
      });
    }
    return sessions.get(phone)!;
  }

  static updateSession(phone: string, updates: Partial<UserSession>): UserSession {
    const session = this.getOrCreateSession(phone);
    Object.assign(session, updates);
    sessions.set(phone, session);
    return session;
  }

  static clearSession(phone: string): void {
    sessions.delete(phone);
  }

  /**
   * שלב התחלה - בקשת מספר קו
   */
  static async handleStart(phone: string): Promise<string> {
    this.getOrCreateSession(phone);
    this.updateSession(phone, { step: "SELECT_LINE" });

    // נשתמש בפורמט הפשוט ביותר
    return "read=t-אנא הקש את מספר הקו המבוקש=LINE,yes,3,1,30,Digits,no,no";
  }

  /**
   * טיפול בבחירת מספר קו
   */
  static async handleLineSelection(phone: string, lineNumber: string): Promise<string> {
    const session = this.getOrCreateSession(phone);

    try {
      const agencies = await GTFSService.getLineBusAgencies(lineNumber);

      if (agencies.length === 0) {
        return "read=t-מצטערים קו זה לא נמצא במערכת אנא הקש את מספר הקו שברצונך לנסוע בו=LINE,yes,3,1,30,Digits,no,no";
      }

      // חברה אחת
      if (agencies.length === 1) {
        this.updateSession(phone, {
          lineNumber,
          agencyId: agencies[0].agency_id,
          agencyName: agencies[0].agency_name,
          step: "SELECT_DIRECTION"
        });

        const directions = await GTFSService.getDirectionsByAgency(lineNumber, agencies[0].agency_id);
        this.updateSession(phone, { directions });

        if (directions.length === 0) {
          return "id_list_message=t-לא נמצאו כיוונים זמינים עבור קו זה\nhangup=yes";
        }

        if (directions.length === 1) {
          return await this.handleDirectionSelection(phone, "0");
        }

        // מספר כיוונים
        let message = `t-קו ${lineNumber} נמצא אנא בחר כיוון`;
        directions.forEach((dir, index) => {
          message += `.t-לחץ ${index} ל ${dir.direction_name}`;
        });

        return `read=${message}=DIRECTION,yes,1,1,10,Digits,no,no`;
      }

      // מספר חברות
      this.updateSession(phone, {
        lineNumber,
        agencies,
        step: "SELECT_AGENCY"
      });

      let message = `t-קו ${lineNumber} מופעל על ידי ${agencies.length} חברות`;
      agencies.forEach((agency, index) => {
        message += `.t-לחץ ${index} ל ${agency.agency_name}`;
      });

      return `read=${message}=AGENCY,yes,1,1,10,Digits,no,no`;

    } catch (error) {
      console.error("Error in handleLineSelection:", error);
      return "id_list_message=t-אירעה שגיאה במערכת\nhangup=yes";
    }
  }

  /**
   * טיפול בבחירת חברה
   */
  static async handleAgencySelection(phone: string, agencyIndex: string): Promise<string> {
    const session = this.getOrCreateSession(phone);

    if (!session.agencies || !session.lineNumber) {
      return "id_list_message=t-אירעה שגיאה אנא התחל מחדש\nhangup=yes";
    }

    const index = parseInt(agencyIndex);
    if (isNaN(index) || index < 0 || index >= session.agencies.length) {
      let message = `t-בחירה לא חוקית אנא בחר חברה`;
      session.agencies.forEach((agency, i) => {
        message += `.t-לחץ ${i} ל ${agency.agency_name}`;
      });
      return `read=${message}=AGENCY,yes,1,1,10,Digits,no,no`;
    }

    const selectedAgency = session.agencies[index];

    try {
      const directions = await GTFSService.getDirectionsByAgency(session.lineNumber, selectedAgency.agency_id);

      this.updateSession(phone, {
        agencyId: selectedAgency.agency_id,
        agencyName: selectedAgency.agency_name,
        directions,
        step: "SELECT_DIRECTION"
      });

      if (directions.length === 0) {
        return "id_list_message=t-לא נמצאו כיוונים זמינים עבור חברה זו\nhangup=yes";
      }

      if (directions.length === 1) {
        return await this.handleDirectionSelection(phone, "0");
      }

      let message = `t-נבחרה חברת ${selectedAgency.agency_name} אנא בחר כיוון`;
      directions.forEach((dir, index) => {
        message += `.t-לחץ ${index} ל ${dir.direction_name}`;
      });

      return `read=${message}=DIRECTION,yes,1,1,10,Digits,no,no`;

    } catch (error) {
      console.error("Error in handleAgencySelection:", error);
      return "id_list_message=t-אירעה שגיאה\nhangup=yes";
    }
  }

  /**
   * טיפול בבחירת כיוון
   */
  static async handleDirectionSelection(phone: string, directionIndex: string): Promise<string> {
    const session = this.getOrCreateSession(phone);

    if (!session.directions || !session.agencyId || !session.lineNumber) {
      return "id_list_message=t-אירעה שגיאה\nhangup=yes";
    }

    const index = parseInt(directionIndex);
    if (isNaN(index) || index < 0 || index >= session.directions.length) {
      let message = `t-בחירה לא חוקית אנא בחר כיוון`;
      session.directions.forEach((dir, i) => {
        message += `.t-לחץ ${i} ל ${dir.direction_name}`;
      });
      return `read=${message}=DIRECTION,yes,1,1,10,Digits,no,no`;
    }

    const selectedDirection = session.directions[index];

    try {
      const stops = await GTFSService.getStopsForRoute(
        selectedDirection.route_id,
        selectedDirection.direction_id,
        session.agencyId
      );

      this.updateSession(phone, {
        directionId: selectedDirection.direction_id,
        routeId: selectedDirection.route_id,
        stops,
        step: "SELECT_BOARDING"
      });

      let message = `t-נבחר כיוון ${selectedDirection.direction_name} נמצאו ${stops.length} תחנות אנא בחר תחנת עלייה`;
      const displayStops = stops.slice(0, 5);
      displayStops.forEach((stop, index) => {
        message += `.t-לחץ ${index} לתחנה ${stop.stop_name}`;
      });

      return `read=${message}=BOARDING,yes,2,1,10,Digits,no,no`;

    } catch (error) {
      console.error("Error in handleDirectionSelection:", error);
      return "id_list_message=t-אירעה שגיאה\nhangup=yes";
    }
  }

  /**
   * טיפול בבחירת תחנת עלייה
   */
  static async handleBoardingStopSelection(phone: string, stopIndex: string): Promise<string> {
    const session = this.getOrCreateSession(phone);

    if (!session.stops) {
      return "id_list_message=t-אירעה שגיאה\nhangup=yes";
    }

    const index = parseInt(stopIndex);
    if (isNaN(index) || index < 0 || index >= session.stops.length) {
      let message = `t-בחירה לא חוקית אנא בחר תחנת עלייה`;
      const displayStops = session.stops.slice(0, 5);
      displayStops.forEach((stop, i) => {
        message += `.t-לחץ ${i} לתחנה ${stop.stop_name}`;
      });
      return `read=${message}=BOARDING,yes,2,1,10,Digits,no,no`;
    }

    const selectedStop = session.stops[index];

    this.updateSession(phone, {
      boardingStop: selectedStop.stop_name,
      boardingStopIndex: index,
      step: "SELECT_ALIGHTING"
    });

    const remainingStops = session.stops.slice(index + 1);

    let message = `t-נבחרה תחנת עלייה ${selectedStop.stop_name} אנא בחר תחנת ירידה`;
    remainingStops.slice(0, 5).forEach((stop, i) => {
      message += `.t-לחץ ${i} לתחנה ${stop.stop_name}`;
    });

    return `read=${message}=ALIGHTING,yes,2,1,10,Digits,no,no`;
  }

  /**
   * טיפול בבחירת תחנת ירידה ויצירת הנסיעה
   */
  static async handleAlightingStopSelection(phone: string, stopIndex: string, userId: string): Promise<string> {
    const session = this.getOrCreateSession(phone);

    if (!session.stops || !session.boardingStop || session.boardingStopIndex === undefined) {
      return "id_list_message=t-אירעה שגיאה\nhangup=yes";
    }

    const index = parseInt(stopIndex);
    const actualIndex = session.boardingStopIndex + 1 + index;

    if (isNaN(index) || actualIndex >= session.stops.length) {
      const remainingStops = session.stops.slice(session.boardingStopIndex + 1);
      let message = `t-בחירה לא חוקית אנא בחר תחנת ירידה`;
      remainingStops.slice(0, 5).forEach((stop, i) => {
        message += `.t-לחץ ${i} לתחנה ${stop.stop_name}`;
      });
      return `read=${message}=ALIGHTING,yes,2,1,10,Digits,no,no`;
    }

    const selectedStop = session.stops[actualIndex];

    try {
      const result = await GTFSService.handleIVRTripCreation({
        userId,
        spokenRouteNumber: session.lineNumber!,
        spokenBoardingStop: session.boardingStop,
        spokenAlightingStop: selectedStop.stop_name,
        agencyId: session.agencyId!,
        directionId: session.directionId!
      });

      this.clearSession(phone);

      if (result.success) {
        return (
          `id_list_message=t-נסיעה נוצרה בהצלחה` +
          `.t-קו ${session.lineNumber} מ ${session.boardingStop} ל ${selectedStop.stop_name}` +
          `.t-קוד אישור ${result.confirmationCode}` +
          `.t-מחיר ${result.price} שקלים` +
          `.t-תודה שבחרת בשירות שלנו\n` +
          `hangup=yes`
        );
      } else {
        return `id_list_message=t-אירעה שגיאה ביצירת הנסיעה ${result.message}\nhangup=yes`;
      }
    } catch (error) {
      console.error("Error in handleAlightingStopSelection:", error);
      this.clearSession(phone);
      return "id_list_message=t-אירעה שגיאה\nhangup=yes";
    }
  }

  static handleHangup(phone: string): void {
    this.clearSession(phone);
    console.log(`📞 שיחה הסתיימה עבור ${phone}`);
  }
}