// src/Models/IVR.ts
export interface UserSession {
  phone: string;
  step: "START" | "SELECT_LINE" | "SELECT_AGENCY" | "SELECT_DIRECTION" | "SELECT_BOARDING" | "SELECT_ALIGHTING"|"SELECT_BOARDING_STOP"|"SELECT_ALIGHTING_STOP";
  lineNumber?: string;
  agencies?: Array<{ agency_id: string; agency_name: string }>;
  agencyId?: string;
  agencyName?: string;
  directions?: Array<{ route_id: string; direction_id: number; direction_name: string }>;
  directionId?: number;
  routeId?: string;
  stops?: Array<{ stop_id: string; stop_name: string; stop_sequence: number }>;
  boardingStop?: string;
  boardingStopIndex?: number;
  lastInput?: string;}