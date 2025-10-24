import { GTFSService } from "./GTFSService";
import { TripService } from "./TripService";
import { UserSession, TrainRegion } from "../Models/IVR";
import { extractDigits } from "../Utils/Confirm";
import { UserService } from "./UserService";

// אזורי רכבת
const TRAIN_REGIONS: Record<TrainRegion, { name: string; stations: string[] }> = {
  center: {
    name: "תל אביב והמרכז",
    stations: [
      "37292", // תל אביב ההגנה
      "37350", // השלום
      "37358", // תל אביב מרכז
      "37360", // תא אוניברסיטה
      "37362", // הרצליה
      "37336", // רמלה
      "37338", // לוד
      "37298", // ראשונים
      "37306", // נתב"ג
      "37394", // מודיעין מרכז
      "37396", // פאתי מודיעין
      "42418"  // מזכרת בתיה
    ]
  },
  jerusalem: {
    name: "ירושלים והסביבה",
    stations: [
      "37322"  // בית שמש
    ]
  },
  south: {
    name: "דרום הארץ",
    stations: [
      "37316", // קרית גת
      "42419", // קרית מלאכי
      "37312", // באר שבע מרכז
      "37314", // באר שבע צפון
      "37308"  // להבים רהט
    ]
  },
  north: {
    name: "צפון הארץ",
    stations: [
      "37380", // חיפה מרכז
      "37378", // בת גלים
      "37376", // חוף הכרמל
      "37374", // עתלית
      "37372", // בנימינה
      "37382", // נהריה
      "37384", // עכו
      "42507", // מרכזית המפרץ
      "37388", // מרכזית המפרץ/קו החוף
      "37386", // חוצות מפרץ
      "37392", // קרית חיים
      "41293", // קרית מוצקין
      "40584", // כפר יהושע
      "40581", // כפר ברוך
      "40582", // עפולה
      "40583"  // בית שאן
    ]
  }
};

// פונקציות עזר
function formatPriceForIVR(price: number): string {
  const shekels = Math.floor(price);
  const agorot = Math.round((price - shekels) * 100);

  if (agorot === 0) {
    return `${shekels} שקלים`;
  } else if (agorot === 50) {
    return `${shekels} שקלים וחצי`;
  } else {
    return `${shekels} שקלים ו ${agorot} אגורות`;
  }
}

function cleanTextForIVR(text: string, maxLength: number = 30): string {
  let cleaned = text
    .replace(/_/g, " ")
    .replace(/\//g, " ")
    .replace(/['"]/g, "")
    .replace(/--+/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength);
    const lastSpace = cleaned.lastIndexOf(" ");
    if (lastSpace > maxLength * 0.7) {
      cleaned = cleaned.substring(0, lastSpace);
    }
  }

  return cleaned;
}

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
    console.log("📝 updateSession - Before:", JSON.stringify(session, null, 2));
    Object.assign(session, updates);
    sessions.set(phone, session);
    console.log("✅ updateSession - After:", JSON.stringify(session, null, 2));
    return session;
  }

  static clearSession(phone: string): void {
    sessions.delete(phone);
  }

  /**
   * שלב התחלה
   */
  static async handleStart(phone: string): Promise<string> {
    this.getOrCreateSession(phone);
    this.updateSession(phone, { step: "SELECT_TRANSPORT_TYPE" });
    const message = `t-לנסיעה באוטובוס הקש 1, לנסיעה ברכבת הקש 2`;
    return `read=${message}=TRANSPORT_TYPE,yes,1,1,30,Digits,no,no`;
  }

  /**
   * בחירת סוג תחבורה
   */
  static async handleTransportTypeSelection(phone: string, transportType: string): Promise<string> {
    if (transportType === "1") {
      this.updateSession(phone, {
        transportType: "bus",
        step: "SELECT_LINE"
      });
      const message = "t-אנא הקש את מספר הקו המבוקש";
      return `read=${message}=LINE,yes,3,1,30,Digits,no,no`;
    } else if (transportType === "2") {
      this.updateSession(phone, {
        transportType: "train",
        agencyId: "2",
        step: "SELECT_TRAIN_REGION"
      });
      return this.getTrainRegionsList(phone);
    } else {
      const message = `t-בחירה לא חוקית.t-לחץ 1 לאוטובוס.t-לחץ 2 לרכבת`;
      return `read=${message}=TRANSPORT_TYPE,yes,1,1,30,Digits,no,no`;
    }
  }

  /**
   * בחירת אזור רכבת
   */
  static getTrainRegionsList(phone: string): string {
    let message = "t-אנא בחר אזור";
    message += ".t-הקש 1 לתל אביב והמרכז";
    message += ".t-הקש 2 לירושלים והסביבה";
    message += ".t-הקש 3 לדרום הארץ";
    message += ".t-הקש 4 לצפון הארץ";
    return `read=${message}=TRAIN_REGION,yes,1,1,30,Digits,no,no`;
  }

  /**
   * טיפול בבחירת אזור
   */
  static async handleTrainRegionSelection(phone: string, regionIndex: string): Promise<string> {
    const regions: TrainRegion[] = ["center", "jerusalem", "south", "north"];
    const index = parseInt(regionIndex) - 1;

    if (index < 0 || index >= regions.length) {
      return this.getTrainRegionsList(phone);
    }

    const selectedRegion = regions[index];
    this.updateSession(phone, {
      trainRegion: selectedRegion,
      step: "SELECT_TRAIN_ORIGIN"
    });

    return await this.getTrainStationsByRegion(phone, selectedRegion, "origin");
  }

  /**
   * קבלת תחנות לפי אזור
   */
  static async getTrainStationsByRegion(
    phone: string,
    region: TrainRegion,
    type: "origin" | "destination"
  ): Promise<string> {
    try {
      const regionData = TRAIN_REGIONS[region];
      const allStations = await GTFSService.getTrainStations();
      
      const regionalStations = allStations.filter(station =>
        regionData.stations.includes(station.stop_id)
      );

      if (regionalStations.length === 0) {
        console.log(`❌ No stations found for region ${region}`);
        return "id_list_message=t-לא נמצאו תחנות באזור זה אנא בחר אזור אחר\nhangup=yes";
      }

      this.updateSession(phone, { trainStations: regionalStations });

      const messageType = type === "origin" ? "תחנת מוצא" : "תחנת יעד";
      let message = `t-אזור ${regionData.name} אנא בחר ${messageType}`;
      
      regionalStations.slice(0, 9).forEach((station, index) => {
        const cleanName = cleanTextForIVR(station.stop_name, 25);
        message += `.t-הקש ${index} ל ${cleanName}`;
      });

      const varName = type === "origin" ? "TRAIN_ORIGIN" : "TRAIN_DESTINATION";
      return `read=${message}=${varName},yes,1,1,30,Digits,no,no`;
    } catch (error) {
      console.error("Error getting regional stations:", error);
      return "id_list_message=t-אירעה שגיאה\nhangup=yes";
    }
  }

  /**
   * בחירת תחנת רכבת מוצא
   */
  static async handleTrainOriginSelection(phone: string, stationIndex: string): Promise<string> {
    const session = this.getOrCreateSession(phone);

    if (!session.trainStations || !session.trainRegion) {
      return "id_list_message=t-אירעה שגיאה\nhangup=yes";
    }

    const index = parseInt(stationIndex);
    if (isNaN(index) || index < 0 || index >= session.trainStations.length) {
      return await this.getTrainStationsByRegion(phone, session.trainRegion, "origin");
    }

    const originStation = session.trainStations[index];

    this.updateSession(phone, {
      trainOriginStopId: originStation.stop_id,
      trainOriginStopName: originStation.stop_name,
      step: "SELECT_TRAIN_DESTINATION"
    });

    return await this.getTrainStationsByRegion(phone, session.trainRegion, "destination");
  }

  /**
   * 🚀 בחירת תחנת רכבת יעד - עם הודעת המתנה
   */
  static async handleTrainDestinationSelection(phone: string, stationIndex: string): Promise<string> {
    const session = this.getOrCreateSession(phone);

    if (!session.trainStations || !session.trainOriginStopId) {
      return "id_list_message=t-אירעה שגיאה\nhangup=yes";
    }

    const index = parseInt(stationIndex);
    if (isNaN(index) || index < 0 || index >= session.trainStations.length) {
      return await this.getTrainStationsByRegion(phone, session.trainRegion!, "destination");
    }

    const destinationStation = session.trainStations[index];

    if (destinationStation.stop_id === session.trainOriginStopId) {
      return "read=t-תחנת היעד זהה לתחנת המוצא אנא בחר תחנה אחרת=TRAIN_DESTINATION,yes,1,1,30,Digits,no,no";
    }

    // 🚀 הוסף הודעת המתנה
    console.log("⏳ Starting train trip creation - this may take a few seconds...");

    const userData = await UserService.getUserByPhone(phone);
    
    try {
      const result = await GTFSService.createTrainTrip({
        userId: userData?.id,
        originStopId: session.trainOriginStopId,
        destinationStopId: destinationStation.stop_id,
        agencyId: "2"
      });

      this.clearSession(phone);

      if (result.success) {
        const confirmCode = extractDigits(result.confirmationCode);
        const priceText = result.price;
        const fromStop = cleanTextForIVR(session.trainOriginStopName!, 30);
        const toStop = cleanTextForIVR(destinationStation.stop_name, 30);

        return (
          `id_list_message=t-נסיעת רכבת נוצרה בהצלחה` +
          `.t-מ ${fromStop}` +
          `.t-ל ${toStop}` +
          `.t-קוד אישור ${confirmCode}` +
          `.t-מחיר ${priceText}` +
          `.t-תודה שבחרת בשירות שלנו\n` +
          `hangup=yes`
        );
      } else {
        return `id_list_message=t-אירעה שגיאה ${result.message}\nhangup=yes`;
      }
    } catch (error) {
      console.error("❌ Error creating train trip:", error);
      this.clearSession(phone);
      return "id_list_message=t-אירעה שגיאה\nhangup=yes";
    }
  }

  /**
   * טיפול בבחירת מספר קו
   */
  static async handleLineSelection(phone: string, lineNumber: string): Promise<string> {
    const session = this.getOrCreateSession(phone);

    lineNumber = lineNumber.replace(/^0+/, '') || '0';

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
        const normalizedDirections = directions.map(dir => ({
          ...dir,
          first_stop: dir.first_stop === null ? undefined : dir.first_stop,
          last_stop: dir.last_stop === null ? undefined : dir.last_stop
        }));
        this.updateSession(phone, { directions: normalizedDirections });

        if (directions.length === 0) {
          return "id_list_message=t-לא נמצאו כיוונים זמינים עבור קו זה\nhangup=yes";
        }
        console.log(`📊 directions: {directions}`);
        if (directions.length === 1) {
          return await this.handleDirectionSelection(phone, "0");
        }

        let message = `t-קו ${lineNumber} נמצא אנא בחר כיוון`;
        directions.slice(0, 9).forEach((dir, index) => {
          const cleanName = cleanTextForIVR(dir.direction_name, 25);
          message += `.t-לחץ ${index} ל ${cleanName}`;
        });

        return `read=${message}=DIRECTION,yes,1,1,10,Digits,no,no`;
      }

      // 🔧 מספר חברות - בדוק אם צריך פיצול
      if (agencies.length > 8) {
        this.updateSession(phone, {
          lineNumber,
          agencies,
          agencyPage: 0,
          step: "SELECT_AGENCY_PAGE"
        });
        return this.showAgencyPage(phone, 0);
      }

      // עד 8 חברות - הצג רגיל
      this.updateSession(phone, {
        lineNumber,
        agencies,
        step: "SELECT_AGENCY"
      });

      let message = `t-קו ${lineNumber} מופעל על ידי ${agencies.length} חברות`;
      agencies.forEach((agency, index) => {
        const cleanName = cleanTextForIVR(agency.agency_name, 12);
        message += `t-הקש ${index} ל ${cleanName}`;
      });

      return `read=${message}=AGENCY,yes,1,1,30,Digits,no,no`;
    } catch (error) {
      console.error("Error in handleLineSelection:", error);
      return "id_list_message=t-אירעה שגיאה במערכת\nhangup=yes";
    }
  }

  /**
   * 🔧 הצגת דף חברות - תוקן
   */
static showAgencyPage(phone: string, page: number): string {
  try {
    const session = this.getOrCreateSession(phone);

    if (!session.agencies || session.agencies.length === 0) {
      console.error("❌ No agencies in session");
      return "id_list_message=t-לא נמצאו חברות תואמות\nhangup=yes";
    }

    if (!session.lineNumber) {
      console.error("❌ Missing lineNumber in session");
      return "id_list_message=t-חסר מידע על קו הנסיעה\nhangup=yes";
    }

    const itemsPerPage = 8; // מקשים 0–7 לחברות, 9 לעמוד הבא
    const totalAgencies = session.agencies.length;
    const totalPages = Math.ceil(totalAgencies / itemsPerPage);
    const safePage = Math.max(0, Math.min(page, totalPages - 1));

    const start = safePage * itemsPerPage;
    const end = Math.min(start + itemsPerPage, totalAgencies);
    const pageAgencies = session.agencies.slice(start, end);
    const hasMore = end < totalAgencies;

    console.log(
      `📄 Showing agencies (page ${safePage + 1}/${totalPages}): ${start}-${end - 1} | total=${totalAgencies} | hasMore=${hasMore}`
    );

    let message = `t-קו ${session.lineNumber} נמצא, אנא בחר חברה`;

    pageAgencies.forEach((agency, index) => {
      const cleanName = cleanTextForIVR(agency.agency_name, 20);
      message += `.t-ל ${cleanName} הקש ${index}`;
    });

    if (hasMore) {
      message += ".t-הקש 9 לעמוד הבא";
    }
console.log("🧾 Raw IVR message:", message);

    return `read=${message}=SELECT_AGENCY_PAGE,yes,1,1,30,Digits,no,no`;
  } catch (err) {
    console.error("⚠️ Error in showAgencyPage:", err);
    return "id_list_message=t-שגיאה פנימית בעת הצגת רשימת החברות\nhangup=yes";
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
      const currentPage = session.agencyPage || 0;
      return this.showAgencyPage(phone, currentPage);
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
        directions: directions.map(dir => ({
          ...dir,
          first_stop: dir.first_stop === null ? undefined : dir.first_stop,
          last_stop: dir.last_stop === null ? undefined : dir.last_stop
        })),
        step: "SELECT_DIRECTION"
      });

      if (directions.length === 0) {
        return "id_list_message=t-לא נמצאו כיוונים זמינים עבור חברה זו\nhangup=yes";
      }

      if (directions.length === 1) {
        return await this.handleDirectionSelection(phone, "0");
      }

      let message = `t-נבחרה חברת ${selectedAgency.agency_name} אנא בחר כיוון`;
      directions.slice(0, 9).forEach((dir, index) => {
        const cleanName = cleanTextForIVR(dir.direction_name, 25);
        message += `.t-לחץ ${index} ל ${cleanName}`;
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
      session.directions.slice(0, 9).forEach((dir, i) => {
        const cleanName = cleanTextForIVR(dir.direction_name, 25);
        message += `.t-לחץ ${i} ל ${cleanName}`;
      });
      return `read=${message}=DIRECTION,yes,1,1,30,Digits,no,no`;
    }

    const selectedDirection = session.directions[index];

    try {
      const { firstStop, lastStop } = await GTFSService.getFirstAndLastStops(
        selectedDirection.route_id,
        selectedDirection.direction_id,
        session.agencyId
      );

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

      const message =
        `t-נבחר כיוון` +
        `.t-הקש 1 לנסיעה מלאה` +
        `.t-הקש 2 להקיש מספר תחנות`;

      return `read=${message}=STOP_METHOD,yes,1,1,60,Digits,no,no`;
    } catch (error) {
      console.error("Error in handleDirectionSelection:", error);
      return "id_list_message=t-אירעה שגיאה\nhangup=yes";
    }
  }

  /**
   * בחירת שיטת הזנת תחנות
   */
  static async handleStopMethodSelection(phone: string, method: string): Promise<string> {
    const session = this.getOrCreateSession(phone);

    if (!session.firstStop || !session.lastStop) {
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
   * יצירת נסיעה מלאה
   */
  static async createFullTrip(phone: string): Promise<string> {
    const session = this.getOrCreateSession(phone);

    if (
      !session.firstStop ||
      !session.lastStop ||
      !session.routeId ||
      session.directionId === undefined ||
      !session.agencyId
    ) {
      return "id_list_message=t-אירעה שגיאה\nhangup=yes";
    }

    try {
      const result = await GTFSService.createTripWithStopIds({
        userId: phone,
        routeId: session.routeId,
        directionId: session.directionId,
        agencyId: session.agencyId,
        boardingStopId: session.firstStop.stop_id,
        alightingStopId: session.lastStop.stop_id
      });

      this.clearSession(phone);

      if (result.success) {
        const confirmCode = extractDigits(result.confirmationCode);
        const priceText = result.price;
        const fromStop = cleanTextForIVR(session.firstStop.stop_name, 30);
        const toStop = cleanTextForIVR(session.lastStop.stop_name, 30);

        return (
          `id_list_message=t-נסיעה נוצרה בהצלחה` +
          `.t-קו ${session.lineNumber}` +
          `.t-מ ${fromStop}` +
          `.t-ל ${toStop}` +
          `.t-קוד אישור ${confirmCode}` +
          `.t-מחיר ${priceText}` +
          `.t-תודה שבחרת בשירות שלנו\n` +
          `hangup=yes`
        );
      } else {
        return `id_list_message=t-אירעה שגיאה ${result.message}\nhangup=yes`;
      }
    } catch (error) {
      console.error("Error in createFullTrip:", error);
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
   * קבלת מספר תחנת ירידה
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

      const boardingStopId =
        typeof session.boardingStop === "string"
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
        const boardingName =
          typeof session.boardingStop === "string"
            ? session.boardingStop
            : session.boardingStop.stop_name;

        const confirmCode = extractDigits(result.confirmationCode);
        const priceText = result.price;
        const fromStop = cleanTextForIVR(boardingName, 30);
        const toStop = cleanTextForIVR(stop.stop_name, 30);

        return (
          `id_list_message=t-נסיעה נוצרה בהצלחה` +
          `.t-קו ${session.lineNumber}` +
          `.t-מ ${fromStop}` +
          `.t-ל ${toStop}` +
          `.t-קוד אישור ${confirmCode}` +
          `.t-מחיר ${priceText}` +
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

  static handleHangup(phone: string): void {
    this.clearSession(phone);
    console.log(`📞 שיחה הסתיימה עבור ${phone}`);
  }
}