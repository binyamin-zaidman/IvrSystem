import { GTFSService } from "./GTFSService";
import { TripService } from "./TripService";
import { UserSession } from "../Models/IVR";
import { extractDigits } from "../Utils/Confirm";

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
    console.log("📝 updateSession - Before update:");
    console.log("  Phone:", phone);
    console.log("  Current session:", JSON.stringify(session, null, 2));
    console.log("  Updates:", JSON.stringify(updates, null, 2));
    
    Object.assign(session, updates);
    sessions.set(phone, session);
    
    console.log("✅ updateSession - After update:");
    console.log("  Updated session:", JSON.stringify(session, null, 2));
    console.log("  Sessions map size:", sessions.size);
    
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

        const directions = await GTFSService.getDirectionsByAgency(
          lineNumber, 
          agencies[0].agency_id
        );
        
        this.updateSession(phone, { directions });

        if (directions.length === 0) {
          return "id_list_message=t-לא נמצאו כיוונים זמינים עבור קו זה\nhangup=yes";
        }

        // אם יש כיוון אחד - עבור ישירות
        if (directions.length === 1) {
          console.log("⚡ Single direction found, automatically selecting it");
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
      const directions = await GTFSService.getDirectionsByAgency(
        session.lineNumber, 
        selectedAgency.agency_id
      );

      this.updateSession(phone, {
        agencyId: selectedAgency.agency_id,
        agencyName: selectedAgency.agency_name,
        directions,
        step: "SELECT_DIRECTION"
      });

      if (directions.length === 0) {
        return "id_list_message=t-לא נמצאו כיוונים זמינים עבור חברה זו\nhangup=yes";
      }

      // אם יש כיוון אחד - עבור ישירות לבחירת כיוון
      if (directions.length === 1) {
        console.log("⚡ Single direction found, automatically selecting it");
        return await this.handleDirectionSelection(phone, "0");
      }

      // אם יש מספר כיוונים - תן למשתמש לבחור
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
      console.log(`🔄 Getting first and last stops for route ${selectedDirection.route_id}`);
      
      const { firstStop, lastStop } = await GTFSService.getFirstAndLastStops(
        selectedDirection.route_id,
        selectedDirection.direction_id,
        session.agencyId
      );

      console.log(`✅ First stop: ${firstStop.stop_name}`);
      console.log(`✅ Last stop: ${lastStop.stop_name}`);

      // שמור את כל הפרטים בסשן
      this.updateSession(phone, {
        directionId: selectedDirection.direction_id,
        routeId: selectedDirection.route_id,
        firstStop: {
          stop_id: firstStop.stop_id,
          stop_name: firstStop.stop_name
        },
        lastStop: {
          stop_id: lastStop.stop_id,
          stop_name: lastStop.stop_name
        },
        step: "SELECT_STOP_METHOD"
      });

      console.log("🔄 Updated session with stops:");
      console.log("  Session phone:", phone);
      console.log("  firstStop:", firstStop);
      console.log("  lastStop:", lastStop);
      
      // וידוא שה-session עודכן
      const updatedSession = this.getOrCreateSession(phone);
      console.log("✅ Verified session after update:");
      console.log("  Has firstStop?", !!updatedSession.firstStop);
      console.log("  Has lastStop?", !!updatedSession.lastStop);

      // פשט את ההודעה - הסר תווים בעייתיים ושמות תחנות ארוכים
      const message = 
        `t-נבחר כיוון` +
        `.t-לחץ 1 לנסיעה מלאה` +
        `.t-לחץ 2 להקיש מספר תחנות`;

      console.log("📤 Sending simplified message:", message);
      return `read=${message}=STOP_METHOD,yes,1,1,60,Digits,no,no`;

    } catch (error) {
      console.error("❌ Error in handleDirectionSelection:", error);
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
        const confirmCode = extractDigits(result.confirmationCode);
        return (
          `id_list_message=t-נסיעה נוצרה בהצלחה` +
          `.t-קו ${session.lineNumber} מ ${session.boardingStop} ל ${selectedStop.stop_name}` +
          `.t-קוד אישור ${confirmCode}` +
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

  /**
   * בחירת שיטת הזנת תחנות
   */
  static async handleStopMethodSelection(phone: string, method: string): Promise<string> {
    const session = this.getOrCreateSession(phone);

    console.log("🔍 handleStopMethodSelection - Session state:");
    console.log("  firstStop:", session.firstStop);
    console.log("  lastStop:", session.lastStop);
    console.log("  routeId:", session.routeId);
    console.log("  directionId:", session.directionId);
    console.log("  agencyId:", session.agencyId);

    if (!session.firstStop || !session.lastStop) {
      console.log("❌ Missing firstStop or lastStop in session!");
      return "id_list_message=t-אירעה שגיאה\nhangup=yes";
    }

    const methodIndex = parseInt(method);

    if (methodIndex === 1) {
      return await this.createFullTrip(phone);
    } else if (methodIndex === 2) {
      this.updateSession(phone, { step: "ENTER_BOARDING_CODE" });
      
      const message = 
        `t-אנא הקש את מספר תחנת העלייה` +
        `.t-מספר התחנה מופיע בשלט התחנה`;
      
      return `read=${message}=BOARDING_CODE,yes,5,1,30,Digits,no,no`;
    } else {
      const message = 
        `t-בחירה לא חוקית` +
        `.t-לחץ 1 לנסיעה מלאה` +
        `.t-לחץ 2 להקיש מספר תחנות`;
      
      return `read=${message}=STOP_METHOD,yes,1,1,30,Digits,no,no`;
    }
  }

  /**
   * יצירת נסיעה מלאה (תחנה ראשונה לאחרונה)
   */
  static async createFullTrip(phone: string): Promise<string> {
    const session = this.getOrCreateSession(phone);

    console.log("🚌 createFullTrip - Session details:");
    console.log("  Phone:", phone);
    console.log("  firstStop:", session.firstStop);
    console.log("  lastStop:", session.lastStop);
    console.log("  routeId:", session.routeId);
    console.log("  directionId:", session.directionId);
    console.log("  agencyId:", session.agencyId);
    console.log("  lineNumber:", session.lineNumber);

    console.log("🔍 Checking required fields:");
    console.log("  firstStop exists?", !!session.firstStop);
    console.log("  lastStop exists?", !!session.lastStop);
    console.log("  routeId exists?", !!session.routeId);
    console.log("  directionId value:", session.directionId);
    console.log("  directionId is valid?", session.directionId !== undefined && session.directionId !== null);
    console.log("  agencyId exists?", !!session.agencyId);

    if (!session.firstStop || !session.lastStop || !session.routeId || 
        session.directionId === undefined || session.directionId === null || !session.agencyId) {
      console.log("❌ Missing required fields in createFullTrip!");
      console.log("  Missing:", {
        firstStop: !session.firstStop,
        lastStop: !session.lastStop,
        routeId: !session.routeId,
        directionId: session.directionId === undefined || session.directionId === null,
        agencyId: !session.agencyId
      });
      return "id_list_message=t-אירעה שגיאה\nhangup=yes";
    }

    try {
      console.log("📞 Calling createTripWithStopIds with:");
      console.log("  userId:", phone);
      console.log("  routeId:", session.routeId);
      console.log("  directionId:", session.directionId);
      console.log("  agencyId:", session.agencyId);
      console.log("  boardingStopId:", session.firstStop.stop_id);
      console.log("  alightingStopId:", session.lastStop.stop_id);

      const result = await GTFSService.createTripWithStopIds({
        userId: phone,
        routeId: session.routeId,
        directionId: session.directionId,
        agencyId: session.agencyId,
        boardingStopId: session.firstStop.stop_id,
        alightingStopId: session.lastStop.stop_id
      });

      console.log("✅ createTripWithStopIds result:", result);

      this.clearSession(phone);

      if (result.success) {
        const confirmCode = extractDigits(result.confirmationCode);
        return (
          `id_list_message=t-נסיעה נוצרה בהצלחה` +
          `.t-קו ${session.lineNumber}` +
          `.t-מ ${session.firstStop.stop_name}` +
          `.t-ל ${session.lastStop.stop_name}` +
          `.t-קוד אישור ${confirmCode}` +
          `.t-מחיר ${result.price} שקלים` +
          `.t-תודה שבחרת בשירות שלנו\n` +
          `hangup=yes`
        );
      } else {
        return `id_list_message=t-אירעה שגיאה ${result.message}\nhangup=yes`;
      }
    } catch (error) {
      console.error("❌ Error in createFullTrip:", error);
      this.clearSession(phone);
      return "id_list_message=t-אירעה שגיאה\nhangup=yes";
    }
  }

  /**
   * קבלת מספר תחנת עלייה
   */
  static async handleBoardingCodeEntry(phone: string, stopCode: string): Promise<string> {
    const session = this.getOrCreateSession(phone);

    try {
      const stop = await GTFSService.searchStopByCode(stopCode);

      if (!stop) {
        return "read=t-מספר תחנה לא נמצא אנא הקש שוב את מספר תחנת העלייה=BOARDING_CODE,yes,5,1,30,Digits,no,no";
      }

      const check = await GTFSService.isStopOnRoute(
        stop.stop_id,
        session.routeId!,
        session.directionId!,
        session.agencyId!
      );

      if (!check.isOnRoute) {
        return "read=t-תחנה זו אינה על המסלול אנא הקש מספר תחנה אחר=BOARDING_CODE,yes,5,1,30,Digits,no,no";
      }

      this.updateSession(phone, {
        boardingStop: stop.stop_id,
        step: "ENTER_ALIGHTING_CODE"
      });

      const message = 
        `t-נבחרה תחנת עלייה ${stop.stop_name}` +
        `.t-אנא הקש את מספר תחנת הירידה`;

      return `read=${message}=ALIGHTING_CODE,yes,5,1,30,Digits,no,no`;

    } catch (error) {
      console.error("Error in handleBoardingCodeEntry:", error);
      return "read=t-אירעה שגיאה אנא הקש שוב=BOARDING_CODE,yes,5,1,30,Digits,no,no";
    }
  }

  /**
   * קבלת מספר תחנת ירידה ויצירת הנסיעה
   */
  static async handleAlightingCodeEntry(phone: string, stopCode: string): Promise<string> {
    const session = this.getOrCreateSession(phone);

    if (!session.boardingStop) {
      return "id_list_message=t-אירעה שגיאה\nhangup=yes";
    }

    try {
      const stop = await GTFSService.searchStopByCode(stopCode);

      if (!stop) {
        return "read=t-מספר תחנה לא נמצא אנא הקש שוב את מספר תחנת הירידה=ALIGHTING_CODE,yes,5,1,30,Digits,no,no";
      }

      const check = await GTFSService.isStopOnRoute(
        stop.stop_id,
        session.routeId!,
        session.directionId!,
        session.agencyId!
      );

      if (!check.isOnRoute) {
        return "read=t-תחנה זו אינה על המסלול אנא הקש מספר תחנה אחר=ALIGHTING_CODE,yes,5,1,30,Digits,no,no";
      }

      const boardingStopId = typeof session.boardingStop === 'string' 
        ? session.boardingStop 
        : session.boardingStop.stop_id;

      const result = await GTFSService.createTripWithStopIds({
        userId: phone,
        routeId: session.routeId!,
        directionId: session.directionId!,
        agencyId: session.agencyId!,
        boardingStopId: boardingStopId,
        alightingStopId: stop.stop_id
      });

      this.clearSession(phone);

      if (result.success) {
        const boardingName = typeof session.boardingStop === 'string' 
          ? session.boardingStop 
          : session.boardingStop.stop_name;

        const confirmCode = extractDigits(result.confirmationCode);

        return (
          `id_list_message=t-נסיעה נוצרה בהצלחה` +
          `.t-קו ${session.lineNumber}` +
          `.t-מ ${boardingName}` +
          `.t-ל ${stop.stop_name}` +
          `.t-קוד אישור ${confirmCode}` +
          `.t-מחיר ${result.price} שקלים` +
          `.t-תודה שבחרת בשירות שלנו\n` +
          `hangup=yes`
        );
      } else {
        return `id_list_message=t-אירעה שגיאה ${result.message}\nhangup=yes`;
      }

    } catch (error) {
      console.error("Error in handleAlightingCodeEntry:", error);
      this.clearSession(phone);
      return "id_list_message=t-אירעה שגיאה\nhangup=yes";
    }
  }
}