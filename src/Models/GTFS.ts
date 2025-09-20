import { Stop} from "./Stop";
export interface DirectionResult {
  direction_id: number;
  direction_name: string;
  first_stop: {
    name: string;
    stop_code: string;
    coordinates: { lat: number; lon: number };
    frequency: number;
    reliability_percentage: string;
    description: string;
  } | null;
  last_stop: {
    name: string;
    stop_code: string;
    coordinates: { lat: number; lon: number };
    frequency: number;
    reliability_percentage: string;
    description: string;
  } | null;
  total_trips: number;
  route_long_name: string;
  route_description: string;
  alternative_headsigns: string[];
  common_patterns: string[];

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
export interface StopInfo
  {
  name: string;
  stop_code: string;
  coordinates: { lat: number; lon: number };
  frequency: number;
  reliability_percentage: string;
  description: string;
}

export interface StopTimeRow {
  trip_id: string;
  stop_sequence: number;
  stops: { stop_name: string }; // לא מערך, אלא אובייקט בודד
};

export interface TripDirection {
  trip_id: string;
  direction_id: number;
  first_stop: string;
  last_stop: string;
}
interface Route {
  route_id: string;
  route_long_name: string;
}
export interface StopData {
  stop_sequence: number;
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  stop_desc: string;
  arrival_time: string;
  departure_time: string;
  location_type: number;
  count: number;
}


export interface  Trip {
  trip_id: string;
  direction_id: number;
  trip_headsign: string;
  service_id: string;
}

interface DirectionInfo {
  direction_id: number;
  direction_name: string;
  destination_city: string;
  destination_place: string;
  trip_count: number;
  headsign: string;
}

interface BusLineActivity {
  line_number: string;
  agency_id: string;
  activity_type: 'single_city' | 'multi_city';
  cities: string[];
  directions: DirectionInfo[];
  route_long_name: string;
  question_type: 'ask_direction_only' | 'ask_city_then_direction';
}

