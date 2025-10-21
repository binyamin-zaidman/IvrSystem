  // src/Models/IVR.ts
  export interface UserSession {
    phone: string;
    step: "START" | "SELECT_LINE" | "SELECT_AGENCY" | "SELECT_DIRECTION" | "SELECT_BOARDING" | "SELECT_ALIGHTING"|"SELECT_BOARDING_STOP"|"SELECT_ALIGHTING_STOP"|"ENTER_BOARDING_CODE"|"ENTER_ALIGHTING_CODE"|"SELECT_STOP_METHOD";
    lineNumber?: string;
    agencies?: Array<{ agency_id: string; agency_name: string }>;
    agencyId?: string;
    agencyName?: string;
    directions?: Array<{ route_id: string; direction_id: number; direction_name: string }>;
    directionId?: number;
    routeId?: string;
    stops?: Array<{ stop_id: string; stop_name: string; stop_sequence: number }>;
    boardingStop?: any;
    boardingStopIndex?: number;
    lastInput?: string;
    firstStop?: any;
    lastStop?: any;
  }
    