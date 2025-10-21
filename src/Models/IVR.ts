// Models/IVR.ts - עדכן את ה-interface

export interface UserSession {
  phone: string;
  step: 
    | "START"
    | "SELECT_TRANSPORT_TYPE"  // 🆕 חדש
    | "SELECT_LINE"
    | "SELECT_AGENCY"
    | "SELECT_DIRECTION"
    | "SELECT_STOP_METHOD"
    | "ENTER_BOARDING_CODE"
    | "ENTER_ALIGHTING_CODE"
    | "SELECT_BOARDING"
    | "SELECT_ALIGHTING"
    | "SELECT_TRAIN_ORIGIN"      // 🆕 חדש
    | "SELECT_TRAIN_DESTINATION"; // 🆕 חדש
  
  // שדות קיימים
  lineNumber?: string;
  agencyId?: string;
  agencyName?: string;
  agencies?: Array<{agency_id: string, agency_name: string}>;
  directions?: Array<any>;
  directionId?: number;
  routeId?: string;
  firstStop?: {stop_id: string, stop_name: string};
  lastStop?: {stop_id: string, stop_name: string};
  stops?: Array<any>;
  boardingStop?: any;
  boardingStopIndex?: number;
  
  // שדות חדשים לרכבת 🆕
  transportType?: "bus" | "train";
  trainStations?: Array<{stop_id: string, stop_name: string}>;
  trainOriginStopId?: string;
  trainOriginStopName?: string;
}