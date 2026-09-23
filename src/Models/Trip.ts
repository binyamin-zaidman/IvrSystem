import { StopTime } from "./StopTime";

export interface Trip {
  id: string;
  user_id: string;
  line_number: string;
  agency_id: string;
  route_id: string;
  direction_id: number;
  boarding_stop_name: string;
  alighting_stop_name: string;
  boarding_stop_id: string;
  alighting_stop_id: string;
  boarding_coordinates: {
    lat: number;
    lon: number;
  };
  alighting_coordinates: {
    lat: number;
    lon: number;
  };
  trip_date: Date;
  payment_confirmation_code?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  created_at: Date;
}
export interface StopForTrip {
  stop_id: string;
  stop_code: string;
  stop_name: string;
  stop_sequence: number;
  coordinates: {
    lat: number;
    lon: number;
  };
}
export interface TripRequest {
  user_id: string;
  line_number: string;
  agency_id: string;
  route_id: string;
  direction_id: number;
  boarding_stop_id: string;
  alighting_stop_id: string;
  boarding_coordinates: {
    lat: number;
    lon: number;
  };
  alighting_coordinates: {
    lat: number;
    lon: number;
  };
  trip_date?: Date;
}
