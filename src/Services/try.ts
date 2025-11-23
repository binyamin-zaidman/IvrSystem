import { GTFSService } from "./GTFSService";
import { TripService } from "./TripService";
import { UserSession, TrainRegion, IVRResponse } from "../Models/IVR";
import { extractDigits } from "../Utils/Confirm";
import { UserService } from "./UserService";

// אזורי רכבת
const TRAIN_REGIONS = {
  jerusalem: {
    name: "ירושלים והסביבה",
    stations: [
      "42286", // ירושלים יצחק נבון
      "37322" // בית שמש
    ]
  },

  center: {
    name: "תל אביב והמרכז",
    stations: [
      "37292", // ת״א ההגנה
      "37360", // ת״א אוניברסיטה
      "37358", // ת״א מרכז
      "37350", // ת״א השלום
      "37336", // רמלה
      "37298", // ראשון לציון ראשונים
      "37306", // נתב"ג
      "37338", // לוד
      "37334", // לוד-גני אביב
      "37394", // מודיעין מרכז
      "37396", // פאתי מודיעין
      "42418", // מזכרת בתיה
      "37296", // הוד השרון
      "37304", // כפר סבא
      "37302", // ראש העין צפון
      "37354", // קריית אריה
      "37364", // בית יהושע
      "37368", // חדרה מערב
      "37370", // קיסריה פרדס חנה
      "37366", // נתניה
      "40640", // נתניה קריית ספיר
      "37356", // בני ברק
      "37340", // כפר חבד
      "37346", // חולון וולפסון
      "37348", // צומת חולון
      "37344", // בת ים יוספטל
      "37342", // בת ים קוממיות
      "37300", // יבנה מערב
      "37332", // רחובות
      "37328", // יבנה מזרח
      "37330", // באר יעקב
      "37294" // ראשון לציון משה דיין
    ]
  },

  south: {
    name: "הדרום",
    stations: [
      "37316", // קריית גת
      "37314", // באר שבע צפון
      "37312", // באר שבע מרכז
      "37308", // להבים רהט
      "37326", // אשדוד עד הלום
      "37324", // אשקלון
      "37290", // שדרות
      "38643", // נתיבות
      "39260", // אופקים
      "37310", // דימונה
      "42419" // קריית מלאכי
    ]
  },

  north: {
    name: "הצפון",
    stations: [
      "37380", // חיפה מרכז
      "37378", // חיפה בת גלים
      "37376", // חוף הכרמל
      "37374", // עתלית
      "37372", // בנימינה
      "37382", // נהריה
      "37384", // עכו
      "42507", // מרכזית המפרץ
      "37388", // מרכזית המפרץ/קו החוף
      "37386", // חוצות המפרץ
      "37392", // קריית חיים
      "41293", // קריית מוצקין
      "41292", // כרמיאל
      "41291", // אחיהוד
      "40581", // כפר ברוך
      "40582", // עפולה
      "40583", // בית שאן
      "40584" // כפר יהושע
    ]
  }
};

// ================== פונקציות עזר ==================

function normalizeInput(input: string | string[] | undefined): string {
  if (!input) return "";

  if (Array.isArray(input)) {
    // קח את הערך האחרון (הכי עדכני)
    const lastValue = input[input.length - 1];
    return (lastValue || "").trim();
  }

  return input.trim();
}

function isValidDigits(input: string): boolean {
  return /^\d+$/.test(input);
}

function parseValidInteger(
  input: string | string[],
  min: number = 0,
  max?: number
): number | null {
  const normalized = normalizeInput(input);
  if (!normalized || !isValidDigits(normalized)) return null;
  const num = parseInt(normalized, 10);
  if (isNaN(num) || num < min || (max !== undefined && num > max)) return null;
  return num;
}

function cleanTextForIVR(text: string, maxLength: number = 30): string {
  let cleaned = text
    .replace(/_/g, " ")
    .replace(/\//g, " ")
    .replace(/['"]/g, "")
    .replace(/--+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\./g, "")
    .trim();
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength);
    const lastSpace = cleaned.lastIndexOf(" ");
    if (lastSpace > maxLength * 0.7) cleaned = cleaned.substring(0, lastSpace);
  }
  return cleaned;
}

const sessions = new Map<string, UserSession>();

export class IVRService {
  static getOrCreateSession(phone: string): UserSession {
    if (!sessions.has(phone)) {
      sessions.set(phone, { phone, step: "START" });
    }
    return sessions.get(phone)!;
  }

  static updateSession(
    phone: string,
    updates: Partial<UserSession>
  ): UserSession {
    const session = this.getOrCreateSession(phone);
    Object.assign(session, updates);
    sessions.set(phone, session);
    return session;
  }

  static clearSession(phone: string): void {
    sessions.delete(phone);
  }

  // ================== פונקציה מרכזית - FSM ==================
  static async handleInput(
    phone: string,
    input?: string | string[]
  ): Promise<IVRResponse> {
    const session = this.getOrCreateSession(phone);
    let nextStep: string;

    console.log(
      `📞 handleInput - Phone: ${phone}, Step: ${session.step}, Input:`,
      input
    );

    switch (session.step) {
      case "START":
        nextStep = await this.handleStart(phone);
        break;

      case "SELECT_TRANSPORT_TYPE":
        nextStep = await this.handleTransportTypeSelection(phone, input ?? "");
        break;

      case "SELECT_LINE":
        nextStep = await this.handleLineSelection(phone, input ?? "");
        break;

      case "SELECT_AGENCY":
        nextStep = await this.handleAgencySelection(phone, input ?? "");
        break;

      case "SELECT_DIRECTION":
        nextStep = await this.handleDirectionSelection(phone, input ?? "");
        break;

      case "SELECT_STOP_METHOD":
        nextStep = await this.handleStopMethodSelection(phone, input ?? "");
        break;

      case "ENTER_BOARDING_CODE":
        nextStep = await this.handleBoardingCodeEntry(phone, input ?? "");
        break;

      case "ENTER_ALIGHTING_CODE":
        nextStep = await this.handleAlightingCodeEntry(phone, input ?? "");
        break;

      case "SELECT_TRAIN_ORIGIN":
        nextStep = await this.handleTrainOriginRegionSelection(
          phone,
          input ?? ""
        );
        break;

      case "SELECT_TRAIN_ORIGIN_STOP":
        nextStep = await this.handleTrainOriginSelection(phone, input ?? "");
        break;

      case "SELECT_TRAIN_DEST_REGION":
        nextStep = await this.handleTrainDestRegionSelection(
          phone,
          input ?? ""
        );
        break;

      case "SELECT_TRAIN_DESTINATION":
        nextStep = await this.handleTrainDestinationSelection(
          phone,
          input ?? ""
        );
        break;

      default:
        console.error(`❌ Unknown step: ${session.step}`);
        nextStep = "id_list_message=t-אירעה שגיאה\nhangup=yes";
    }

    console.log(`✅ Next step response: ${nextStep.substring(0, 100)}...`);

    return {
      session,
      nextStep
    };
  }

  // ================== START ==================

  static async handleStart(phone: string): Promise<string> {
    console.log(`🎬 START - Phone: ${phone}`);
    this.getOrCreateSession(phone);
    this.updateSession(phone, { step: "SELECT_TRANSPORT_TYPE" });
    const message = `t-לנסיעה באוטובוס הקש 1, לנסיעה ברכבת הקש 2`;
    return `read=${message}=TRANSPORT_TYPE,yes,1,1,30,Digits,no,no,,1.2`;
  }

  // ================== TRANSPORT TYPE ==================

  static async handleTransportTypeSelection(
    phone: string,
    transportType: string | string[]
  ): Promise<string> {
    console.log(`🚌🚂 TRANSPORT_TYPE - Input:`, transportType);

    const type = parseValidInteger(transportType, 1, 2);

    if (type === 1) {
      console.log("✅ Selected BUS");
      this.updateSession(phone, { transportType: "bus", step: "SELECT_LINE" });
      return `read=t-אנא הקש את מספר הקו המבוקש=LINE,yes,3,1,30,digits,no,no`;
    }
    if (type === 2) {
      console.log("✅ Selected TRAIN");
      this.updateSession(phone, {
        transportType: "train",
        agencyId: "2",
        step: "SELECT_TRAIN_ORIGIN"
      });
      return await this.getTrainRegionsList(phone, "origin");
    }
    console.warn(`⚠️ Invalid transport type: ${type}`);
    return `read=t-ניתן לבחור נסיעה באוטובס או ברכבת.t-הקש 1 לאוטובוס.t-הקש 2 לרכבת=TRANSPORT_TYPE,yes,1,1,30,Digits,no,no,1.2`;
  }

  // ================== TRAIN - אזורים ==================

  static getTrainRegionsList(
    phone: string,
    type: "origin" | "destination"
  ): string {
    const messageType = type === "origin" ? "תחנת מוצא" : "תחנת יעד";
    let message = `t-לבחירת ${messageType}`;
    message += ".t-באזור המרכז הקש 1";
    message += ".t-באזור ירושלים הקש 2";
    message += ".t-באזור הדרום הקש 3";
    message += ".t-באזור הצפון הקש 4";
    const varName =
      type === "origin" ? "TRAIN_REGION_ORIGIN" : "TRAIN_REGION_DEST";
    return `read=${message}=${varName},yes,1,1,30,Digits,no,no,,1.2.3.4`;
  }

  static async handleTrainOriginRegionSelection(
    phone: string,
    regionIndex: string | string[]
  ): Promise<string> {
    const regions: TrainRegion[] = ["center", "jerusalem", "south", "north"];
    const normalizedInput = normalizeInput(regionIndex);

    console.log(`🚂 Train origin region - input:`, regionIndex);
    console.log(`📥 Normalized: "${normalizedInput}"`);

    const index = parseValidInteger(normalizedInput, 1, 4);

    if (index === null || index < 1 || index > regions.length) {
      return this.getTrainRegionsList(phone, "origin");
    }

    const selectedRegion = regions[index - 1];
    console.log(`✅ Selected origin region: ${selectedRegion}`);

    this.updateSession(phone, {
      trainRegion: selectedRegion,
      step: "SELECT_TRAIN_ORIGIN_STOP"
    });

    return await this.getTrainStationsByRegion(phone, selectedRegion, "origin");
  }

  static async getTrainStationsByRegion(
    phone: string,
    region: TrainRegion,
    type: "origin" | "destination"
  ): Promise<string> {
    try {
      const regionData = TRAIN_REGIONS[region];
      console.log(`🚂 Getting stations for region: ${region}, type: ${type}`);

      const allStations = await GTFSService.getTrainStations();

      const filteredStations = allStations.filter((station) =>
        regionData.stations.includes(station.stop_id)
      );

      console.log(`Stations:`, filteredStations);
      if (filteredStations.length === 0) {
        return "id_list_message=t-לא נמצאו תחנות באזור זה\nhangup=yes";
      }

      this.updateSession(phone, { trainStations: filteredStations });

      const messageType = type === "origin" ? "תחנת מוצא" : "תחנת יעד";
      let message = `t-בחר ${messageType} באזור ${regionData.name}`;

      filteredStations.forEach((station, index) => {
        const cleanName = cleanTextForIVR(station.stop_name, 20);
        message += `.t-לתחנת ${cleanName}, הקש ${index + 1}`;
      });

      const varName = type === "origin" ? "TRAIN_ORIGIN" : "TRAIN_DESTINATION";
      return `read=${message}=${varName},yes,2,1,30,Digits,no,no`;
    } catch (error) {
      console.error("❌ Error getting regional stations:", error);
      return "id_list_message=t-אירעה שגיאה\nhangup=yes";
    }
  }

  static async handleTrainOriginSelection(
    phone: string,
    stationIndex: string | string[]
  ): Promise<string> {
    const session = this.getOrCreateSession(phone);

    if (!session.trainStations || !session.trainRegion) {
      return "id_list_message=t-אירעה שגיאה\nhangup=yes";
    }

    const normalizedInput = normalizeInput(stationIndex);
    console.log(`🚂 Train origin selection - input:`, stationIndex);
    console.log(`📥 Normalized: "${normalizedInput}"`);

    const index = parseValidInteger(
      normalizedInput,
      1,
      session.trainStations.length
    );

    if (index === null) {
      console.warn(`⚠️ Invalid station index: "${normalizedInput}"`);
      return await this.getTrainStationsByRegion(
        phone,
        session.trainRegion,
        "origin"
      );
    }

    const originStation = session.trainStations[index - 1];
    console.log(
      `✅ Selected origin: ${originStation.stop_name} (${originStation.stop_id})`
    );

    this.updateSession(phone, {
      trainOriginStopId: originStation.stop_id,
      trainOriginStopName: originStation.stop_name,
      step: "SELECT_TRAIN_DEST_REGION"
    });

    return this.getTrainRegionsList(phone, "destination");
  }

  static async handleTrainDestRegionSelection(
    phone: string,
    regionIndex: string | string[]
  ): Promise<string> {
    const regions: TrainRegion[] = ["center", "jerusalem", "south", "north"];
    const normalizedInput = normalizeInput(regionIndex);

    console.log(`🚂 Train dest region - input:`, regionIndex);
    console.log(`📥 Normalized: "${normalizedInput}"`);

    const index = parseValidInteger(normalizedInput, 1, 4);

    if (index === null || index < 1 || index > regions.length) {
      return this.getTrainRegionsList(phone, "destination");
    }

    const selectedRegion = regions[index - 1];
    console.log(`✅ Selected dest region: ${selectedRegion}`);

    this.updateSession(phone, {
      trainDestRegion: selectedRegion,
      step: "SELECT_TRAIN_DESTINATION"
    });

    return await this.getTrainStationsByRegion(
      phone,
      selectedRegion,
      "destination"
    );
  }

  static async handleTrainDestinationSelection(
    phone: string,
    stationIndex: string | string[]
  ): Promise<string> {
    const session = this.getOrCreateSession(phone);

    if (
      !session.trainStations ||
      !session.trainOriginStopId ||
      !session.trainDestRegion
    ) {
      return "id_list_message=t-אירעה שגיאה\nhangup=yes";
    }

    const normalizedInput = normalizeInput(stationIndex);
    console.log(`🚂 Train destination - input:`, stationIndex);
    console.log(`📥 Normalized: "${normalizedInput}"`);

    const index = parseValidInteger(
      normalizedInput,
      1,
      session.trainStations.length
    );

    if (index === null) {
      console.warn(`⚠️ Invalid station index: "${normalizedInput}"`);
      return await this.getTrainStationsByRegion(
        phone,
        session.trainDestRegion,
        "destination"
      );
    }

    const destinationStation = session.trainStations[index - 1];
    console.log(
      `✅ Selected destination: ${destinationStation.stop_name} (${destinationStation.stop_id})`
    );

    if (destinationStation.stop_id === session.trainOriginStopId) {
      return "read=t-תחנת היעד זהה לתחנת המוצא, בחר תחנה אחרת=TRAIN_DESTINATION,yes,2,1,30,Digits,no,no";
    }

    console.log("⏳ Starting train trip creation...");

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
        const confirmCode = extractDigits(result.confirmationCode || "");
        const priceText = result.price
        const fromStop = cleanTextForIVR(session.trainOriginStopName!, 30);
        const toStop = cleanTextForIVR(destinationStation.stop_name, 30);

        return (
          `id_list_message=t-נסיעת רכבת נוצרה בהצלחה` +
          `.t-מ ${fromStop} ל ${toStop}` +
          `.t-קוד אישור ${confirmCode}` +
          `.t-מחיר ${priceText} שקלים` +
          `.t-נסיעה טובה\nhangup=yes`
        );
      } else {
        return `id_list_message=t-שגיאה: ${result.message}\nhangup=yes`;
      }
    } catch (error) {
      console.error("❌ Error creating train trip:", error);
      this.clearSession(phone);
      return "id_list_message=t-אירעה שגיאה\nhangup=yes";
    }
  }

  // ================== BUS - קו ==================

  static async handleLineSelection(
    phone: string,
    lineNumber: string | string[]
  ): Promise<string> {
    const session = this.getOrCreateSession(phone);
    const normalized = normalizeInput(lineNumber);

    console.log(`🚌 Line selection - Raw input:`, lineNumber);
    console.log(`🚌 Line selection - Normalized: "${normalized}"`);

    if (normalized === "*" || normalized === "#" || normalized === "") {
      console.warn(
        `⚠️ Special character detected: "${normalized}" - disconnecting`
      );
      this.clearSession(phone);
      return "id_list_message=t-השיחה מסתיימת תודה\nhangup=yes";
    }

    if (!isValidDigits(normalized)) {
      console.warn(`⚠️ Invalid input (not digits): "${normalized}"`);
      return "read=t-מספר קו לא תקין אנא הקש ספרות בלבד=LINE,no,3,1,30,Digits,no,no";
    }

    const cleanedLine = normalized.replace(/^0+/, "") || "0";
    if (!/^[1-9]\d{0,2}$/.test(normalized)) {
      console.warn(`⚠️ Line number out of range: "${normalized}"`);
      return "read=t-מספר קו לא תקין אנא הקש מספר בין 1 ל 999=LINE,no,3,1,30,Digits,no,no";
    }

    console.log(`✅ Cleaned line number: ${cleanedLine}`);

    if (!session.lineAttempts) {
      session.lineAttempts = 0;
    }

    try {
      const agencies = await GTFSService.getLineBusAgencies(cleanedLine);

      if (agencies.length === 0|| !agencies) {
        session.lineAttempts++;
        return "read=t-מצטערים קו זה לא נמצא במערכת אנא הקש את מספר הקו=LINE,no,3,1,30,Digits,no,no";
      
      }

      session.lineAttempts = 0;

      this.updateSession(phone, {
        lineNumber: cleanedLine,
        agencies,
        step: "SELECT_AGENCY"
      });

      if (agencies.length === 1) {
        return await this.handleAgencySelection(phone, "1");
      }

      let message = `t-קו ${cleanedLine}`;
      agencies.forEach((agency, index) => {
        const cleanName = cleanTextForIVR(agency.agency_name, 15);
        message += `.t-${cleanName} הקש ${index + 1}`;
      });

      return `read=${message}=AGENCY,yes,2,1,60,Digits,no,no`;
    } catch (error) {
      console.error("❌ Error in handleLineSelection:", error);
      this.clearSession(phone);
      return "id_list_message=t-אירעה שגיאה במערכת\nhangup=yes";
    }
  }

  // ================== BUS - חברה ==================

  static async handleAgencySelection(
    phone: string,
    agencyIndex: string | string[]
  ): Promise<string> {
    const session = this.getOrCreateSession(phone);

    if (!session.agencies || !session.lineNumber) {
      return "id_list_message=t-אירעה שגיאה אנא התחל מחדש\nhangup=yes";
    }

    const normalizedInput = normalizeInput(agencyIndex);

    console.log(`✅ Handling AGENCY selection:`, agencyIndex);
    console.log(`📥 Normalized input: "${normalizedInput}"`);

    const index = parseValidInteger(
      normalizedInput,
      1,
      session.agencies.length
    );

    if (index === null) {
      console.warn(`⚠️ Invalid agency index: "${normalizedInput}"`);
      let message = `t-בחירה לא חוקית אנא הקש מספר בין 1 ל ${session.agencies.length}`;
      return `read=${message}=AGENCY,yes,2,1,30,Digits,no,no`;
    }

    const selectedAgency = session.agencies[index - 1];

    try {
      const directions = await GTFSService.getDirectionsByAgency(
        session.lineNumber,
        selectedAgency.agency_id
      );

      this.updateSession(phone, {
        agencyId: selectedAgency.agency_id,
        agencyName: selectedAgency.agency_name,
        directions: directions.map((dir) => ({
          ...dir,
          first_stop: dir.first_stop === null ? undefined : dir.first_stop,
          last_stop: dir.last_stop === null ? undefined : dir.last_stop
        })),
        step: "SELECT_DIRECTION"
      });

      if (directions.length === 0) {
        return "id_list_message=t-לא נמצאו כיוונים זמינים\nhangup=yes";
      }

      if (directions.length === 1) {
        return await this.handleDirectionSelection(phone, "1");
      }

      let message = `t-בחר כיוון לנסיעה בקו ${session.lineNumber}`;
      directions.slice(0, 9).forEach((dir, index) => {
        const cleanName = cleanTextForIVR(dir.direction_name, 20);
        message += `.t-לכיוון ${cleanName} הקש ${index + 1}`;
      });

      return `read=${message}=DIRECTION,yes,1,1,60,Digits,no,no`;
    } catch (error) {
      console.error("Error in handleAgencySelection:", error);
      return "id_list_message=t-אירעה שגיאה\nhangup=yes";
    }
  }

  // ================== BUS - כיוון ==================

  static async handleDirectionSelection(
    phone: string,
    directionIndex: string | string[]
  ): Promise<string> {
    const session = this.getOrCreateSession(phone);

    if (!session.directions || !session.agencyId || !session.lineNumber) {
      return "id_list_message=t-אירעה שגיאה\nhangup=yes";
    }

    const normalizedInput = normalizeInput(directionIndex);
    console.log(`🚌 Direction selection - input:`, directionIndex);
    console.log(`📥 Normalized: "${normalizedInput}"`);

    const index = parseValidInteger(
      normalizedInput,
      1,
      session.directions.length
    );

    if (index === null) {
      let message = `t-בחירה לא חוקית אנא הקש מספר בין 1 ל ${session.directions.length}`;
      return `read=${message}=DIRECTION,yes,1,1,30,Digits,no,no`;
    }

    const selectedDirection = session.directions[index - 1];

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
        `t-הקש 1 לנסיעה מלאה מתחנת מוצא לתחנת יעד` +
        `.t-הקש 2 לבחירת תחנת עלייה וירידה`;

      return `read=${message}=STOP_METHOD,yes,1,1,60,Digits,no,no`;
    } catch (error) {
      console.error("Error in handleDirectionSelection:", error);
      return "id_list_message=t-אירעה שגיאה\nhangup=yes";
    }
  }

  // ================== BUS - שיטת תחנות ==================

  static async handleStopMethodSelection(
    phone: string,
    method: string | string[]
  ): Promise<string> {
    const session = this.getOrCreateSession(phone);

    if (!session.firstStop || !session.lastStop) {
      return "id_list_message=t-אירעה שגיאה\nhangup=yes";
    }

    const normalizedInput = normalizeInput(method);
    console.log(`🚌 Stop method - input:`, method);
    console.log(`📥 Normalized: "${normalizedInput}"`);

    const methodIndex = parseValidInteger(normalizedInput, 1, 2);

    if (methodIndex === 1) {
      return await this.createFullTrip(phone);
    } else if (methodIndex === 2) {
      this.updateSession(phone, { step: "ENTER_BOARDING_CODE" });
      const message =
        `t-אנא הקש מספר תחנת העלייה` + `.t-מספר התחנה מופיע בשלט התחנה`;
      return `read=${message}=BOARDING_CODE,yes,5,1,30,Digits,no,no`;
    } else {
      const message =
        `t-בחירה לא חוקית` +
        `.t-לחץ 1 לנסיעה מלאה` +
        `.t-לחץ 2 להקיש מספר תחנות`;
      return `read=${message}=STOP_METHOD,yes,1,1,30,Digits,no,no`;
    }
  }

  // ================== BUS - נסיעה מלאה ==================

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
      console.log("⏳ Creating full trip...");
      const userData = await UserService.getUserByPhone(phone);
      const result = await GTFSService.createTripWithStopIds({
        userId: userData?.id,
        routeId: session.routeId,
        directionId: session.directionId,
        agencyId: session.agencyId,
        boardingStopId: session.firstStop.stop_id,
        alightingStopId: session.lastStop.stop_id
      });

      this.clearSession(phone);

      if (result.success) {
        const confirmCode = extractDigits(result.confirmationCode || "");
        const priceText = result.price;
        const fromStop = cleanTextForIVR(session.firstStop.stop_name, 20);
        const toStop = cleanTextForIVR(session.lastStop.stop_name, 20);

        return (
          `id_list_message=t-נסיעה נוצרה בהצלחה` +
          `.t-קו ${session.lineNumber}` +
          `.t-שנוסע מ: ${fromStop} לכיוון: ${toStop}` +
          `.t-קוד האישור: ${confirmCode}` +
          `.t-מחיר: ${priceText} שקלים` +
          `.t-נסיעה טובה&hangup=yes`
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

  // ================== BUS - תחנת עלייה ==================

  static async handleBoardingCodeEntry(
    phone: string,
    stopCode: string | string[]
  ): Promise<string> {
    const session = this.getOrCreateSession(phone);
    const normalized = normalizeInput(stopCode);

    console.log(`🚌 Boarding code - input:`, stopCode);
    console.log(`📥 Normalized: "${normalized}"`);

    if (!isValidDigits(normalized)) {
      return "read=t-מספר תחנה לא תקין אנא הקש מספרים בלבד=BOARDING_CODE,yes,5,1,30,Digits,no,no";
    }

    try {
      const stop = await GTFSService.searchStopByCode(normalized);

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
        `t-נבחרה תחנת עלייה ${cleanTextForIVR(stop.stop_name, 20)}` +
        `.t-אנא הקש את מספר תחנת הירידה`;

      return `read=${message}=ALIGHTING_CODE,yes,5,1,30,Digits,no,no`;
    } catch (error) {
      console.error("Error in handleBoardingCodeEntry:", error);
      return "read=t-אירעה שגיאה אנא הקש שוב=BOARDING_CODE,yes,5,1,30,Digits,no,no";
    }
  }

  // ================== BUS - תחנת ירידה ==================

  static async handleAlightingCodeEntry(
    phone: string,
    stopCode: string | string[]
  ): Promise<string> {
    const session = this.getOrCreateSession(phone);

    if (!session.boardingStop) {
      return "id_list_message=t-אירעה שגיאה\nhangup=yes";
    }

    const normalized = normalizeInput(stopCode);

    console.log(`🚌 Alighting code - input:`, stopCode);
    console.log(`📥 Normalized: "${normalized}"`);

    if (!isValidDigits(normalized)) {
      return "read=t-מספר תחנה לא תקין אנא הקש מספרים בלבד=ALIGHTING_CODE,yes,5,1,30,Digits,no,no";
    }

    try {
      const stop = await GTFSService.searchStopByCode(normalized);

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

      const userData = await UserService.getUserByPhone(phone);
      const result = await GTFSService.createTripWithStopIds({
        userId: userData?.id,
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

        const confirmCode = extractDigits(result.confirmationCode || "");
        const priceText = result.price
        const fromStop = cleanTextForIVR(boardingName, 30);
        const toStop = cleanTextForIVR(stop.stop_name, 30);

        return (
          `id_list_message=t-נסיעה נוצרה בהצלחה` +
          `.t-קו ${session.lineNumber}` +
          `.t-שנוסע מ: ${fromStop} לכיוון: ${toStop}` +
          `.t-קוד האישור: ${confirmCode}` +
          `.t-מחיר: ${priceText} שקלים` +
          `.t-נסיעה טובה&hangup=yes`  
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

  // ================== סיום שיחה ==================

  static handleHangup(phone: string): void {
    this.clearSession(phone);
    console.log(`📞 שיחה הסתיימה עבור ${phone}`);
  }
}
