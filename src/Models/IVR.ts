// src/Models/IVR.ts

export type TrainRegion = "center" | "jerusalem" | "south" | "north";

export interface Agency {
  agency_id: string;
  agency_name: string;
}
/**
 * ✅ Transport Types
 */
export type TransportType = "bus" | "train";

export interface Direction {
  route_id: string;
  direction_id: number;
  direction_name: string;
  first_stop?: string;
  last_stop?: string;
}

export interface Stop {
  stop_id: string;
  stop_name: string;
}

export interface TrainStation {
  stop_id: string;
  stop_name: string;
}

export type IVRStep =
  | "START"
  | "SELECT_TRANSPORT_TYPE"
  | "SELECT_LINE"
  | "SELECT_AGENCY"
  | "SELECT_DIRECTION"
  | "SELECT_STOP_METHOD"
  | "ENTER_BOARDING_CODE"
  | "ENTER_ALIGHTING_CODE"
  | "SELECT_TRAIN_REGION"
  | "SELECT_TRAIN_ORIGIN"
  | "SELECT_TRAIN_DEST_REGION"
  | "SELECT_TRAIN_DESTINATION"
  | "SELECT_TRAIN_ORIGIN_STOP";


export interface UserSession {
  phone: string;
  step: IVRStep;
  transportType?: "bus" | "train";
  
  // אוטובוס
  lineNumber?: string;
  lineAttempts?: number; 
  agencies?: Agency[];
  agencyBatchIndex?: number; // 🔥 הוספה חדשה
  agencyId?: string;
  agencyName?: string;
  directions?: Direction[];
  directionId?: number;
  routeId?: string;
  firstStop?: Stop;
  lastStop?: Stop;
  boardingStop?: string | Stop;
  
  // רכבת
  trainRegion?: TrainRegion;
  trainDestRegion?: TrainRegion;
  trainStations?: TrainStation[];
  trainOriginStopId?: string;
  trainOriginStopName?: string;
}
export interface IVRResponse {
  session: UserSession; // או טיפוס ממשי של Session
  nextStep: string;
}


/**
 * ✅ Agency Info
 */
export interface AgencyInfo {
  agency_id: string;
  agency_name: string;
}

