// import { GTFSService } from "./GTFSService";
// import { TripService } from "./TripService";
// import { UserSession, TrainRegion } from "../Models/IVR";
// import { extractDigits } from "../Utils/Confirm";
// import { UserService } from "./UserService";

// // אזורי רכבת
// const TRAIN_REGIONS: Record<TrainRegion, { name: string; stations: string[] }> =
//   {
//     center: {
//       name: "תל אביב והמרכז",
//       stations: [
//         "37292",
//         "37350",
//         "37358",
//         "37360",
//         "37362",
//         "37336",
//         "37338",
//         "37298",
//         "37306",
//         "37394",
//         "37396",
//         "42418"
//       ]
//     },
//     jerusalem: {
//       name: "ירושלים והסביבה",
//       stations: ["42286", "35684", "48085", "48475", "11037"]
//     },
//     south: {
//       name: "הדרום ",
//       stations: ["37316", "42419", "37312", "37314", "37308"]
//     },
//     north: {
//       name: "הצפון",
//       stations: [
//         "37380",
//         "37378",
//         "37376",
//         "37374",
//         "37372",
//         "37382",
//         "37384",
//         "42507",
//         "37388",
//         "37386",
//         "37392",
//         "41293",
//         "40584",
//         "40581",
//         "40582",
//         "40583"
//       ]
//     }
//   };

// // ================== פונקציות ולידציה ==================

// /**
//  * נרמול קלט - הופך מערך או מחרוזת למחרוזת נקייה
//  * במקרה של מערך - לוקח רק את האלמנט הראשון (מונע כפילויות מהמערכת)
//  */
// function normalizeInput(input: string | string[]): string {
//   if (Array.isArray(input)) {
//     console.log(`⚠️ Received array input with ${input.length} items:`, input);

//     // ✅ מניעת מערכים ארוכים מדי (סימן לבעיה)
//     if (input.length > 10) {
//       console.error(
//         `❌ Array too long (${input.length} items) - taking only first item`
//       );
//     }

//     // אם זה מערך, קח רק את האלמנט הראשון
//     // זה מטפל במקרה שהמערכת שולחת לחיצות כפולות
//     const firstValue = input.find((item) => item && item.trim());
//     const result = firstValue || "";

//     console.log(`✅ Normalized array to: "${result}"`);
//     return result;
//   }

//   const result = (input || "").trim();
//   console.log(`✅ Normalized string: "${result}"`);
//   return result;
// }

// /**
//  * בדיקה שהקלט מכיל רק ספרות
//  */
// function isValidDigits(input: string): boolean {
//   return /^\d+$/.test(input);
// }

// /**
//  * בדיקה שהקלט הוא מספר שלם תקין
//  */
// function parseValidInteger(
//   input: string | string[],
//   min: number = 0,
//   max?: number
// ): number | null {
//   // נרמול הקלט
//   const normalized = normalizeInput(input);

//   if (!normalized || !isValidDigits(normalized)) {
//     console.warn(`⚠️ Invalid input (not digits): "${normalized}"`);
//     return null;
//   }

//   const num = parseInt(normalized, 10);

//   if (isNaN(num)) {
//     console.warn(`⚠️ Invalid number: "${normalized}"`);
//     return null;
//   }

//   if (num < min) {
//     console.warn(`⚠️ Number ${num} is below minimum ${min}`);
//     return null;
//   }

//   if (max !== undefined && num > max) {
//     console.warn(`⚠️ Number ${num} is above maximum ${max}`);
//     return null;
//   }

//   return num;
// }

// /**
//  * ניקוי טקסט עבור IVR
//  */
// function cleanTextForIVR(text: string, maxLength: number = 30): string {
//   let cleaned = text
//     .replace(/_/g, " ")
//     .replace(/\//g, " ")
//     .replace(/['"]/g, "")
//     .replace(/--+/g, "-")
//     .replace(/\s+/g, " ")
//     .replace(/\./g, " ")
//     .trim();

//   if (cleaned.length > maxLength) {
//     cleaned = cleaned.substring(0, maxLength);
//     const lastSpace = cleaned.lastIndexOf(" ");
//     if (lastSpace > maxLength * 0.7) {
//       cleaned = cleaned.substring(0, lastSpace);
//     }
//   }

//   return cleaned;
// }

// const sessions = new Map<string, UserSession>();

// export class IVRService {
//   static getOrCreateSession(phone: string): UserSession {
//     if (!sessions.has(phone)) {
//       sessions.set(phone, {
//         phone,
//         step: "START"
//       });
//     }
//     return sessions.get(phone)!;
//   }

//   static updateSession(
//     phone: string,
//     updates: Partial<UserSession>
//   ): UserSession {
//     const session = this.getOrCreateSession(phone);
//     console.log("📝 updateSession - Before:", JSON.stringify(session, null, 2));
//     Object.assign(session, updates);
//     sessions.set(phone, session);
//     console.log("✅ updateSession - After:", JSON.stringify(session, null, 2));
//     return session;
//   }

//   static clearSession(phone: string): void {
//     sessions.delete(phone);
//   }

//   // ================== התחלה ==================

//   static async handleStart(phone: string): Promise<string> {
//     this.getOrCreateSession(phone);
//     this.updateSession(phone, { step: "SELECT_TRANSPORT_TYPE" });
//     const message = `t-לנסיעה באוטובוס הקש 1, לנסיעה ברכבת הקש 2`;
//     return `read=${message}=TRANSPORT_TYPE,yes,1,1,30,Digits,no,no`;
//   }

//   // ================== בחירת סוג תחבורה ==================

//   static async handleTransportTypeSelection(
//     phone: string,
//     transportType: string | string[]
//   ): Promise<string> {
//     const type = parseValidInteger(transportType, 1, 2);

//     if (type === 1) {
//       this.updateSession(phone, {
//         transportType: "bus",
//         step: "SELECT_LINE"
//       });
//       const message = "t-אנא הקש את מספר הקו המבוקש";
//       return `read=${message}=LINE,yes,3,1,30,digits,no,no`;
//     } else if (type === 2) {
//       this.updateSession(phone, {
//         transportType: "train",
//         agencyId: "2",
//         step: "SELECT_TRAIN_ORIGIN"
//       });
//       return await this.getTrainRegionsList(phone, "origin");
//     } else {
//       const message = `t-ניתן לבחור נסיעה באוטובס או ברכבת.t-הקש 1 לאוטובוס.t-הקש 2 לרכבת`;
//       return `read=${message}=TRANSPORT_TYPE,yes,1,1,30,Digits,no,no`;
//     }
//   }

//   // ================== רכבת ==================

//   static getTrainRegionsList(
//     phone: string,
//     type: "origin" | "destination"
//   ): string {
//     const messageType = type === "origin" ? "תחנת מוצא" : "תחנת יעד";
//     let message = `t-בחר אזור ל${messageType}`;
//     message += ".t-הקש 1 לתל אביב והמרכז";
//     message += ".t-הקש 2 לירושלים והסביבה";
//     message += ".t-הקש 3 לדרום הארץ";
//     message += ".t-הקש 4 לצפון הארץ";

//     // ✅ תיקון: שימוש בשמות משתנים נכונים
//     const varName =
//       type === "origin" ? "TRAIN_REGION_ORIGIN" : "TRAIN_REGION_DEST";
//     return `read=${message}=${varName},yes,1,1,30,Digits,no,no`;
//   }
//   static async handleTrainOriginRegionSelection(
//     phone: string,
//     regionIndex: string | string[]
//   ): Promise<string> {
//     const regions: TrainRegion[] = ["center", "jerusalem", "south", "north"];
//     const normalizedInput = normalizeInput(regionIndex);

//     console.log(
//       `🚂 Train origin region selection - input: ${
//         Array.isArray(regionIndex) ? regionIndex.join(",") : regionIndex
//       }`
//     );
//     console.log(`📥 Normalized: "${normalizedInput}"`);

//     const index = parseValidInteger(normalizedInput, 1, 4);

//     if (index === null || index < 1 || index > regions.length) {
//       return this.getTrainRegionsList(phone, "origin");
//     }

//     const selectedRegion = regions[index - 1];
//     console.log(`✅ Selected origin region: ${selectedRegion}`);

//     // ✅ תיקון: עדכון ל-SELECT_TRAIN_ORIGIN כדי להציג תחנות
//     this.updateSession(phone, {
//       trainRegion: selectedRegion,
//       step: "SELECT_TRAIN_ORIGIN"
//     });

//     // ✅ הצגת תחנות באזור שנבחר
//     return await this.getTrainStationsByRegion(phone, selectedRegion, "origin");
//   }

//   static async getTrainStationsByRegion(
//     phone: string,
//     region: TrainRegion,
//     type: "origin" | "destination"
//   ): Promise<string> {
//     try {
//       const regionData = TRAIN_REGIONS[region];
//       console.log(`🚂 Getting stations for region: ${region}, type: ${type}`);
//       console.log(`📍 Region stations IDs:`, regionData.stations);

//       const allStations = await GTFSService.getTrainStations();
//       console.log(`📊 Total train stations from DB: ${allStations.length}`);

//       const regionalStations = allStations.filter((station) =>
//         regionData.stations.includes(station.stop_id)
//       );

//       console.log(
//         `✅ Found ${regionalStations.length} stations in region ${region}`
//       );

//       if (regionalStations.length === 0) {
//         console.log(`❌ No stations found for region ${region}`);
//         return "id_list_message=t-לא נמצאו תחנות באזור זה, אנא בחר אזור אחר\nhangup=yes";
//       }

//       this.updateSession(phone, { trainStations: regionalStations });

//       const messageType = type === "origin" ? "תחנת מוצא" : "תחנת יעד";
//       let message = `t-בחר ${messageType} באזור ${regionData.name}`;

//       regionalStations.forEach((station, index) => {
//         const cleanName = cleanTextForIVR(station.stop_name, 20);
//         message += `.t-לתחנת ${cleanName}, הקש ${index + 1}`;
//       });

//       const varName = type === "origin" ? "TRAIN_ORIGIN" : "TRAIN_DESTINATION";
//       return `read=${message}=${varName},yes,2,1,30,Digits,no,no`;
//     } catch (error) {
//       console.error("❌ Error getting regional stations:", error);
//       return "id_list_message=t-אירעה שגיאה בבחירת תחנה\nhangup=yes";
//     }
//   }

//   static async handleTrainOriginSelection(
//     phone: string,
//     stationIndex: string | string[]
//   ): Promise<string> {
//     const session = this.getOrCreateSession(phone);

//     if (!session.trainStations || !session.trainRegion) {
//       return "id_list_message=t-אירעה שגיאה\nhangup=yes";
//     }

//     // נרמול הקלט
//     const normalizedInput = normalizeInput(stationIndex);
//     console.log(
//       `🚂 Train origin selection - input: ${
//         Array.isArray(stationIndex) ? stationIndex.join(",") : stationIndex
//       }`
//     );
//     console.log(`📥 Normalized: "${normalizedInput}"`);
//     console.log(`📊 Available stations: ${session.trainStations.length}`);

//     const index = parseValidInteger(
//       normalizedInput,
//       1,
//       session.trainStations.length
//     );

//     if (index === null) {
//       console.warn(`⚠️ Invalid station index: "${normalizedInput}"`);
//       return await this.getTrainStationsByRegion(
//         phone,
//         session.trainRegion,
//         "origin"
//       );
//     }

//     const originStation = session.trainStations[index - 1];
//     console.log(
//       `✅ Selected origin station: ${originStation.stop_name} (${originStation.stop_id})`
//     );

//     this.updateSession(phone, {
//       trainOriginStopId: originStation.stop_id,
//       trainOriginStopName: originStation.stop_name,
//       step: "SELECT_TRAIN_DEST_REGION"
//     });

//     return this.getTrainRegionsList(phone, "destination");
//   }

//   static async handleTrainDestRegionSelection(
//     phone: string,
//     regionIndex: string | string[]
//   ): Promise<string> {
//     const regions: TrainRegion[] = ["center", "jerusalem", "south", "north"];
//     const index = parseValidInteger(regionIndex, 1, 4);

//     if (index === null || index < 1 || index > regions.length) {
//       return this.getTrainRegionsList(phone, "destination");
//     }

//     const selectedRegion = regions[index - 1];
//     this.updateSession(phone, {
//       trainDestRegion: selectedRegion,
//       step: "SELECT_TRAIN_DESTINATION"
//     });

//     return await this.getTrainStationsByRegion(
//       phone,
//       selectedRegion,
//       "destination"
//     );
//   }

//   static async handleTrainDestinationSelection(
//     phone: string,
//     stationIndex: string | string[]
//   ): Promise<string> {
//     const session = this.getOrCreateSession(phone);

//     if (
//       !session.trainStations ||
//       !session.trainOriginStopId ||
//       !session.trainDestRegion
//     ) {
//       return "id_list_message=t-אירעה שגיאה\nhangup=yes";
//     }

//     // נרמול הקלט
//     const normalizedInput = normalizeInput(stationIndex);
//     console.log(
//       `🚂 Train destination selection - input: ${
//         Array.isArray(stationIndex) ? stationIndex.join(",") : stationIndex
//       }`
//     );
//     console.log(`📥 Normalized: "${normalizedInput}"`);

//     const index = parseValidInteger(
//       normalizedInput,
//       1,
//       session.trainStations.length
//     );

//     if (index === null) {
//       console.warn(`⚠️ Invalid station index: "${normalizedInput}"`);
//       return await this.getTrainStationsByRegion(
//         phone,
//         session.trainDestRegion,
//         "destination"
//       );
//     }

//     const destinationStation = session.trainStations[index - 1];
//     console.log(
//       `✅ Selected destination station: ${destinationStation.stop_name} (${destinationStation.stop_id})`
//     );

//     if (destinationStation.stop_id === session.trainOriginStopId) {
//       return "read=t-תחנת היעד שנבחרה, זהה לתחנת המוצא, אנא בחר תחנה מחדש=TRAIN_DESTINATION,yes,1,1,30,Digits,no,no";
//     }

//     console.log("⏳ Starting train trip creation...");

//     const userData = await UserService.getUserByPhone(phone);

//     try {
//       const result = await GTFSService.createTrainTrip({
//         userId: userData?.id,
//         originStopId: session.trainOriginStopId,
//         destinationStopId: destinationStation.stop_id,
//         agencyId: "2"
//       });

//       this.clearSession(phone);

//       if (result.success) {
//         const confirmCode = extractDigits(result.confirmationCode);
//         const priceText = result.price;
//         const fromStop = cleanTextForIVR(session.trainOriginStopName!, 30);
//         const toStop = cleanTextForIVR(destinationStation.stop_name, 30);

//         return (
//           `id_list_message=t-נסיעת רכבת נוצרה בהצלחה` +
//           `.t-נסיעה מ ${fromStop},` +
//           `.t-לכיוון ${toStop},` +
//           `.t-קוד האישור ${confirmCode},` +
//           `.t-מחיר ${priceText},` +
//           `.t-תודה והמשך נסיעה בטוחה\n` +
//           `hangup=yes`
//         );
//       } else {
//         return `id_list_message=t-אירעה שגיאה ביצירת נסיעה ברכבת ${result.message}\nhangup=yes`;
//       }
//     } catch (error) {
//       console.error("❌ Error creating train trip:", error);
//       this.clearSession(phone);
//       return "id_list_message=t-אירעה שגיאה\nhangup=yes";
//     }
//   }

//   // ================== אוטובוס ==================

//   static async handleLineSelection(
//     phone: string,
//     lineNumber: string | string[]
//   ): Promise<string> {
//     const session = this.getOrCreateSession(phone);

//     // ✅ שלב 1: נרמול הקלט (לוקח רק את הערך הראשון אם זה מערך)
//     const normalized = normalizeInput(lineNumber);

//     console.log(`🚌 Line selection - Raw input:`, lineNumber);
//     console.log(`🚌 Line selection - Normalized: "${normalized}"`);

//     // ✅ שלב 2: טיפול בלחיצות מיוחדות (*, #) - ניתוק
//     if (normalized === "*" || normalized === "#" || normalized === "") {
//       console.warn(
//         `⚠️ Special character or empty input detected: "${normalized}" - disconnecting`
//       );
//       this.clearSession(phone);
//       return "id_list_message=t-השיחה מסתיימת תודה שהתקשרת\nhangup=yes";
//     }

//     // ✅ שלב 3: בדיקה שהקלט מכיל רק ספרות
//     if (!isValidDigits(normalized)) {
//       console.warn(`⚠️ Invalid input (not digits): "${normalized}"`);
//       return "read=t-מספר קו לא תקין אנא הקש ספרות בלבד=LINE,yes,3,1,30,Digits,no,no";
//     }

//     // ✅ שלב 4: בדיקה שמספר הקו בטווח תקין (1-999)
//     if (!/^[1-9]\d{0,2}$/.test(normalized)) {
//       console.warn(`⚠️ Line number out of range: "${normalized}"`);
//       return "read=t-מספר קו לא תקין אנא הקש מספר בין 1 ל 999=LINE,yes,3,1,30,Digits,no,no";
//     }

//     // ✅ שלב 5: ניקוי אפסים מובילים (למשל "007" -> "7")
//     const cleanedLine = normalized.replace(/^0+/, "") || "0";
//     console.log(`✅ Cleaned line number: ${cleanedLine}`);

//     // ✅ שלב 6: מניעת ניסיונות חוזרים - בדיקת מגבלת ניסיונות
//     if (!session.lineAttempts) {
//       session.lineAttempts = 0;
//     }

//     try {
//       const agencies = await GTFSService.getLineBusAgencies(cleanedLine);

//       if (agencies.length === 0) {
//         session.lineAttempts++;

//         // אחרי 3 ניסיונות כושלים - נתק
//         if (session.lineAttempts >= 3) {
//           console.warn(`⚠️ Max attempts reached (${session.lineAttempts})`);
//           this.clearSession(phone);
//           return "id_list_message=t-מצטערים לא הצלחנו לאתר את הקו המבוקש אנא נסה שוב מאוחר יותר\nhangup=yes";
//         }

//         return "read=t-מצטערים קו זה לא נמצא במערכת אנא הקש את מספר הקו שברצונך לנסוע בו=LINE,yes,3,1,30,Digits,no,no";
//       }

//       // ✅ איפוס מונה ניסיונות במקרה של הצלחה
//       session.lineAttempts = 0;

//       this.updateSession(phone, {
//         lineNumber: cleanedLine,
//         agencies,
//         step: "SELECT_AGENCY"
//       });

//       // אם יש רק חברה אחת - קפוץ ישירות לבחירת כיוון
//       if (agencies.length === 1) {
//         return await this.handleAgencySelection(phone, "1");
//       }

//       // הצג רשימת חברות
//       let message = `t-קו ${cleanedLine}`;
//       agencies.forEach((agency, index) => {
//         const cleanName = cleanTextForIVR(agency.agency_name, 15);
//         message += `.t-${cleanName} הקש ${index + 1}`; // ✅ הסרת פסיק מיותר
//       });

//       return `read=${message}=AGENCY,yes,2,1,60,Digits,no,no`;
//     } catch (error) {
//       console.error("❌ Error in handleLineSelection:", error);
//       this.clearSession(phone);
//       return "id_list_message=t-אירעה שגיאה במערכת\nhangup=yes";
//     }
//   }

//   static async handleAgencySelection(
//     phone: string,
//     agencyIndex: string | string[]
//   ): Promise<string> {
//     const session = this.getOrCreateSession(phone);

//     if (!session.agencies || !session.lineNumber) {
//       return "id_list_message=t-אירעה שגיאה אנא התחל מחדש\nhangup=yes";
//     }

//     // נרמול הקלט - לוקח רק את האלמנט הראשון אם זה מערך
//     const normalizedInput = normalizeInput(agencyIndex);

//     console.log(
//       `✅ Handling AGENCY selection: ${
//         Array.isArray(agencyIndex) ? agencyIndex.join(",") : agencyIndex
//       }`
//     );
//     console.log(`📥 Normalized input: "${normalizedInput}"`);

//     const index = parseValidInteger(
//       normalizedInput,
//       1,
//       session.agencies.length
//     );

//     if (index === null) {
//       console.warn(`⚠️ Invalid agency index: "${normalizedInput}"`);
//       let message = `t-בחירה לא חוקית אנא הקש מספר בין 1 ל ${session.agencies.length}`;
//       return `read=${message}=AGENCY,yes,2,1,30,Digits,no,no`;
//     }

//     const selectedAgency = session.agencies[index - 1];

//     try {
//       const directions = await GTFSService.getDirectionsByAgency(
//         session.lineNumber,
//         selectedAgency.agency_id
//       );

//       this.updateSession(phone, {
//         agencyId: selectedAgency.agency_id,
//         agencyName: selectedAgency.agency_name,
//         directions: directions.map((dir) => ({
//           ...dir,
//           first_stop: dir.first_stop === null ? undefined : dir.first_stop,
//           last_stop: dir.last_stop === null ? undefined : dir.last_stop
//         })),
//         step: "SELECT_DIRECTION"
//       });

//       if (directions.length === 0) {
//         return "id_list_message=t-לא נמצאו כיוונים זמינים, עבור חברה זו\nhangup=yes";
//       }

//       if (directions.length === 1) {
//         return await this.handleDirectionSelection(phone, "1");
//       }

//       let message = `t-בחר כיוון לנסיעה בקו ${session.lineNumber}`;
//       directions.slice(0, 9).forEach((dir, index) => {
//         const cleanName = cleanTextForIVR(dir.direction_name, 20);
//         message += `.t-לכיוון ,${cleanName},הקש, ${index + 1}`;
//       });

//       return `read=${message}=DIRECTION,yes,1,1,60,Digits,no,no`;
//     } catch (error) {
//       console.error("Error in handleAgencySelection:", error);
//       return "id_list_message=t-אירעה שגיאה\nhangup=yes";
//     }
//   }

//   static async handleDirectionSelection(
//     phone: string,
//     directionIndex: string | string[]
//   ): Promise<string> {
//     const session = this.getOrCreateSession(phone);

//     if (!session.directions || !session.agencyId || !session.lineNumber) {
//       return "id_list_message=t-אירעה שגיאה\nhangup=yes";
//     }

//     const index = parseValidInteger(
//       directionIndex,
//       1,
//       session.directions.length
//     );

//     if (index === null) {
//       let message = `t-בחירה לא חוקית אנא הקש מספר בין 1 ל ${session.directions.length}`;
//       return `read=${message}=DIRECTION,yes,1,1,30,Digits,no,no`;
//     }

//     const selectedDirection = session.directions[index - 1];

//     try {
//       const { firstStop, lastStop } = await GTFSService.getFirstAndLastStops(
//         selectedDirection.route_id,
//         selectedDirection.direction_id,
//         session.agencyId
//       );

//       this.updateSession(phone, {
//         directionId: selectedDirection.direction_id,
//         routeId: selectedDirection.route_id,
//         firstStop: {
//           stop_id: firstStop.stop_id,
//           stop_name: firstStop.stop_name
//         },
//         lastStop: {
//           stop_id: lastStop.stop_id,
//           stop_name: lastStop.stop_name
//         },
//         step: "SELECT_STOP_METHOD"
//       });

//       const message =
//         `t-הקש 1, לנסיעה לפי תחנת מוצא, ויעד` +
//         `.t-הקש 2,לבחירת, תחנת עלייה, וירידה`;

//       return `read=${message}=STOP_METHOD,yes,1,1,60,Digits,no,no`;
//     } catch (error) {
//       console.error("Error in handleDirectionSelection:", error);
//       return "id_list_message=t-אירעה שגיאה\nhangup=yes";
//     }
//   }

//   static async handleStopMethodSelection(
//     phone: string,
//     method: string | string[]
//   ): Promise<string> {
//     const session = this.getOrCreateSession(phone);

//     if (!session.firstStop || !session.lastStop) {
//       return "id_list_message=t-אירעה שגיאה\nhangup=yes";
//     }

//     const methodIndex = parseValidInteger(method, 1, 2);

//     if (methodIndex === 1) {
//       return await this.createFullTrip(phone);
//     } else if (methodIndex === 2) {
//       this.updateSession(phone, { step: "ENTER_BOARDING_CODE" });
//       const message =
//         `t-אנא הקש מספר תחנת העלייה` + `.t-מספר התחנה מופיע בשלט התחנה`;
//       return `read=${message}=BOARDING_CODE,yes,5,1,30,Digits,no,no`;
//     } else {
//       const message =
//         `t-בחירה לא חוקית` +
//         `.t-לחץ 1 לנסיעה מלאה` +
//         `.t-לחץ 2 להקיש מספר תחנות`;
//       return `read=${message}=STOP_METHOD,yes,1,1,30,Digits,no,no`;
//     }
//   }

//   static async createFullTrip(phone: string): Promise<string> {
//     const session = this.getOrCreateSession(phone);

//     if (
//       !session.firstStop ||
//       !session.lastStop ||
//       !session.routeId ||
//       session.directionId === undefined ||
//       !session.agencyId
//     ) {
//       return "id_list_message=t-אירעה שגיאה\nhangup=yes";
//     }

//     try {
//       console.log("⏳ Creating full trip...");
//       const userData = await UserService.getUserByPhone(phone);
//       const result = await GTFSService.createTripWithStopIds({
//         userId: userData?.id,
//         routeId: session.routeId,
//         directionId: session.directionId,
//         agencyId: session.agencyId,
//         boardingStopId: session.firstStop.stop_id,
//         alightingStopId: session.lastStop.stop_id
//       });

//       this.clearSession(phone);

//       if (result.success) {
//         const confirmCode = extractDigits(result.confirmationCode);
//         const priceText = result.price;
//         const fromStop = cleanTextForIVR(session.firstStop.stop_name, 20);
//         const toStop = cleanTextForIVR(session.lastStop.stop_name, 20);

//         return (
//           `id_list_message=t-נסיעה נוצרה בהצלחה` +
//           `.t-קו ${session.lineNumber}` +
//           `.t-שנוסע מ ${fromStop}` +
//           `.t-ל ${toStop}` +
//           `.t-קוד ${confirmCode}` +
//           `.t-מחיר ${priceText}` +
//           `.t-תודה, והמשך נסיעה טובה\n` +
//           `hangup=yes`
//         );
//       } else {
//         return `id_list_message=t-אירעה שגיאה ${result.message}\nhangup=yes`;
//       }
//     } catch (error) {
//       console.error("Error in createFullTrip:", error);
//       this.clearSession(phone);
//       return "id_list_message=t-אירעה שגיאה\nhangup=yes";
//     }
//   }

//   static async handleBoardingCodeEntry(
//     phone: string,
//     stopCode: string | string[]
//   ): Promise<string> {
//     const session = this.getOrCreateSession(phone);
//     const normalized = normalizeInput(stopCode);

//     if (!isValidDigits(normalized)) {
//       return "read=t-מספר תחנה לא תקין אנא הקש מספרים בלבד=BOARDING_CODE,yes,5,1,30,Digits,no,no";
//     }

//     try {
//       const stop = await GTFSService.searchStopByCode(normalized);

//       if (!stop) {
//         return "read=t-מספר תחנה לא נמצא אנא הקש שוב את מספר תחנת העלייה=BOARDING_CODE,yes,5,1,30,Digits,no,no";
//       }

//       const check = await GTFSService.isStopOnRoute(
//         stop.stop_id,
//         session.routeId!,
//         session.directionId!,
//         session.agencyId!
//       );

//       if (!check.isOnRoute) {
//         return "read=t-תחנה זו אינה על המסלול אנא הקש מספר תחנה אחר=BOARDING_CODE,yes,5,1,30,Digits,no,no";
//       }

//       this.updateSession(phone, {
//         boardingStop: stop.stop_id,
//         step: "ENTER_ALIGHTING_CODE"
//       });

//       const message =
//         `t-נבחרה תחנת עלייה ${stop.stop_name}` +
//         `.t-אנא הקש את מספר תחנת הירידה`;

//       return `read=${message}=ALIGHTING_CODE,yes,5,1,30,Digits,no,no`;
//     } catch (error) {
//       console.error("Error in handleBoardingCodeEntry:", error);
//       return "read=t-אירעה שגיאה אנא הקש שוב=BOARDING_CODE,yes,5,1,30,Digits,no,no";
//     }
//   }

//   static async handleAlightingCodeEntry(
//     phone: string,
//     stopCode: string | string[]
//   ): Promise<string> {
//     const session = this.getOrCreateSession(phone);

//     if (!session.boardingStop) {
//       return "id_list_message=t-אירעה שגיאה\nhangup=yes";
//     }

//     const normalized = normalizeInput(stopCode);

//     if (!isValidDigits(normalized)) {
//       return "read=t-מספר תחנה לא תקין אנא הקש מספרים בלבד=ALIGHTING_CODE,yes,5,1,30,Digits,no,no";
//     }

//     try {
//       const stop = await GTFSService.searchStopByCode(normalized);

//       if (!stop) {
//         return "read=t-מספר תחנה לא נמצא אנא הקש שוב את מספר תחנת הירידה=ALIGHTING_CODE,yes,5,1,30,Digits,no,no";
//       }

//       const check = await GTFSService.isStopOnRoute(
//         stop.stop_id,
//         session.routeId!,
//         session.directionId!,
//         session.agencyId!
//       );

//       if (!check.isOnRoute) {
//         return "read=t-תחנה זו אינה על המסלול אנא הקש מספר תחנה אחר=ALIGHTING_CODE,yes,5,1,30,Digits,no,no";
//       }

//       const boardingStopId =
//         typeof session.boardingStop === "string"
//           ? session.boardingStop
//           : session.boardingStop.stop_id;

//       const result = await GTFSService.createTripWithStopIds({
//         userId: phone,
//         routeId: session.routeId!,
//         directionId: session.directionId!,
//         agencyId: session.agencyId!,
//         boardingStopId: boardingStopId,
//         alightingStopId: stop.stop_id
//       });

//       this.clearSession(phone);

//       if (result.success) {
//         const boardingName =
//           typeof session.boardingStop === "string"
//             ? session.boardingStop
//             : session.boardingStop.stop_name;

//         const confirmCode = extractDigits(result.confirmationCode);
//         const priceText = result.price;
//         const fromStop = cleanTextForIVR(boardingName, 30);
//         const toStop = cleanTextForIVR(stop.stop_name, 30);

//         return (
//           `id_list_message=t-נסיעה נוצרה בהצלחה` +
//           `.t-קו ${session.lineNumber}` +
//           `.t-שנוסע, מ, ${fromStop}` +
//           `.t-לכיוון ${toStop}` +
//           `.t-קוד אישור ${confirmCode}` +
//           `.t-מחיר ${priceText}` +
//           `.t-תודה שבחרת בשירות שלנו\n` +
//           `hangup=yes`
//         );
//       } else {
//         return `id_list_message=t-אירעה שגיאה ${result.message}\nhangup=yes`;
//       }
//     } catch (error) {
//       console.error("Error in handleAlightingCodeEntry:", error);
//       this.clearSession(phone);
//       return "id_list_message=t-אירעה שגיאה\nhangup=yes";
//     }
//   }

//   static handleHangup(phone: string): void {
//     this.clearSession(phone);
//     console.log(`📞 שיחה הסתיימה עבור ${phone}`);
//   }
// }
