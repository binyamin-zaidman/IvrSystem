// Models/IVR.ts

export type IVRStep =
  | "START"
  | "SELECT_TRANSPORT_TYPE"
  | "SELECT_LINE"
  | "SELECT_AGENCY"
  | "SELECT_AGENCY_PAGE"  // 🆕 לטיפול בדפים של חברות
  | "SELECT_DIRECTION"
  | "SELECT_STOP_METHOD"
  | "ENTER_BOARDING_CODE"
  | "ENTER_ALIGHTING_CODE"
  | "SELECT_TRAIN_REGION"  // 🆕 בחירת אזור רכבת
  | "SELECT_TRAIN_ORIGIN"
  | "SELECT_TRAIN_DESTINATION";

export type TrainRegion = "center" | "jerusalem" | "south" | "north";  // 🆕 הוספת ירושלים

export interface DirectionInfo {
  direction_id: number;
  route_id: string;
  direction_name: string;
  first_stop?: {
    name: string;
    stop_code: string;
    coordinates?: {
      lat: number;
      lon: number;
    };
    frequency?: number;
    reliability_percentage?: string;
    description?: string;
  };
  last_stop?: {
    name: string;
    stop_code: string;
    coordinates?: {
      lat: number;
      lon: number;
    };
    frequency?: number;
    reliability_percentage?: string;
    description?: string;
  };
  total_trips?: number;
  route_long_name?: string;
  alternative_headsigns?: string[];
  common_patterns?: string[];
}

export interface AgencyInfo {
  agency_id: string;
  agency_name: string;
}

export interface StopInfo {
  stop_id: string;
  stop_name: string;
}

export interface UserSession {
  phone: string;
  step: IVRStep;
  
  // Bus fields
  transportType?: "bus" | "train";
  lineNumber?: string;
  agencyId?: string;
  agencyName?: string;
  agencies?: AgencyInfo[];
  agencyPage?: number;  // 🆕 עמוד נוכחי בחברות
  directions?: DirectionInfo[];
  directionId?: number;
  routeId?: string;
  firstStop?: StopInfo;
  lastStop?: StopInfo;
  boardingStop?: string | StopInfo;
  boardingStopIndex?: number;
  stops?: any[];
  
  // Train fields
  trainRegion?: TrainRegion;  // 🆕
  trainStations?: Array<{
    stop_id: string;
    stop_name: string;
  }>;
  trainOriginStopId?: string;
  trainOriginStopName?: string;
  trainDestinationStopId?: string;
  trainDestinationStopName?: string;
}