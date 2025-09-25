import { supabase } from "../Config/Supabase";
import {
  Trip,
  StopTimeRow,
  StopData,
  StopInfo,
  DirectionResult,
  StopForTrip
} from "../Models/GTFS";

export class GTFSService {
  static async getLineBusAgencies(lineBusInfo: string) {
    try {
      const { data, error } = await supabase
        .from("routes")
        .select("agency_id, route_long_name")
        .eq("route_short_name", lineBusInfo);

      if (error) throw new Error(`Routes query error: ${error.message}`);
      if (!data || data.length === 0) return [];

      const uniqueAgencyIds = [...new Set(data.map((r) => r.agency_id))];

      const { data: agencies, error: agencyError } = await supabase
        .from("agency")
        .select("agency_id, agency_name")
        .in("agency_id", uniqueAgencyIds);

      if (agencyError)
        throw new Error(`Agencies query error: ${agencyError.message}`);

      return agencies || [];
    } catch (error) {
      console.error(
        `Error in getLineBusAgencies for line ${lineBusInfo}:`,
        error
      );
      throw error;
    }
  }

static async getDirectionsByAgency(
  lineBusInfo: string,
  agencyId: string
): Promise<DirectionResult[]> {
  try {
    console.log(
      `Getting directions for line: ${lineBusInfo}, agency: ${agencyId}`
    );

    if (!supabase) {
      throw new Error("Supabase client not initialized");
    }

    // Step 1: Get all routes for the line and agency
    const { data: routeData, error: routeError } = await supabase
      .from("routes")
      .select("route_id, route_short_name, route_long_name, agency_id")
      .eq("route_short_name", lineBusInfo)
      .eq("agency_id", agencyId)
      .order("route_id");

    if (routeError)
      throw new Error(`Route query error: ${routeError.message}`);
    if (!routeData || routeData.length === 0) {
      console.log(`No routes found for line ${lineBusInfo}, agency ${agencyId}`);
      return [];
    }

    console.log(`Found ${routeData.length} routes for line ${lineBusInfo}`);

    // Step 2: Get all trips for ALL routes in one optimized query
    const routeIds = routeData.map((route) => route.route_id);
    const { data: tripData, error: tripError } = await supabase
      .from("trips")
      .select("trip_id, direction_id, trip_headsign, route_id")
      .in("route_id", routeIds)
      .order("route_id, direction_id");

    if (tripError) 
      throw new Error(`Trips query error: ${tripError.message}`);
    if (!tripData || tripData.length === 0) {
      console.log(`No trips found for routes: ${routeIds}`);
      return [];
    }

    console.log(`Found ${tripData.length} total trips across all routes`);

    // Step 3: Group by route_id + direction_id combination
    const routeDirectionGroups = new Map<
      string, // key: "route_id-direction_id"
      {
        route: typeof routeData[0];
        trips: typeof tripData;
        direction_id: number;
      }
    >();

    // Group trips by route + direction combination
    tripData.forEach((trip) => {
      const route = routeData.find((r) => r.route_id === trip.route_id);
      if (!route) {
        console.warn(`Route not found for trip: ${trip.trip_id}`);
        return;
      }

      const key = `${trip.route_id}-${trip.direction_id}`;
      
      if (!routeDirectionGroups.has(key)) {
        routeDirectionGroups.set(key, {
          route,
          trips: [],
          direction_id: trip.direction_id
        });
      }
      routeDirectionGroups.get(key)!.trips.push(trip);
    });

    console.log(`Created ${routeDirectionGroups.size} route-direction combinations`);

    // Step 4: Process each route-direction combination
    const directions: DirectionResult[] = [];

    for (const [key, group] of routeDirectionGroups) {
      console.log(`Processing ${key}: ${group.route.route_long_name} (Direction ${group.direction_id}) - ${group.trips.length} trips`);
      
      // Use the first trip as representative for getting stop times
      const representativeTrip = group.trips[0];

      // Get stop times for representative trip
      const { data: stopTimes, error: stopError } = await supabase
        .from("stop_times")
        .select(
          `
          stop_sequence,
          stops (
            stop_code,
            stop_name,
            stop_lat,
            stop_lon
          )
        `
        )
        .eq("trip_id", representativeTrip.trip_id)
        .order("stop_sequence", { ascending: true });

      if (stopError) {
        console.error(
          `Error fetching stop times for trip ${representativeTrip.trip_id}:`,
          stopError
        );
        continue;
      }
      
      if (!stopTimes || stopTimes.length === 0) {
        console.warn(`No stops found for trip ${representativeTrip.trip_id}`);
        continue;
      }

      const firstStop = stopTimes[0].stops;
      const lastStop = stopTimes[stopTimes.length - 1].stops;

      if (!firstStop || !lastStop) {
        console.warn(`Invalid stops for trip ${representativeTrip.trip_id}`);
        continue;
      }

      // Create direction result
      const direction: DirectionResult = {
        direction_id: group.direction_id,
        direction_name: this.getDirectionName(
          representativeTrip.trip_headsign,
          firstStop,
          lastStop
        ),
        first_stop: this.createStopInfo(firstStop, group.trips.length),
        last_stop: this.createStopInfo(lastStop, group.trips.length),
        total_trips: group.trips.length,
        route_long_name: group.route.route_long_name || "",
        route_description: `Route ID: ${group.route.route_id}`,
        alternative_headsigns: this.getAlternativeHeadsigns(group.trips),
        common_patterns: ["simple"]
      };

      directions.push(direction);
    }

    console.log(
      `Successfully processed ${directions.length} directions for line ${lineBusInfo}`
    );
    
    // Step 5: Sort results for consistent ordering
    directions.sort((a, b) => {
      // First by route_long_name, then by direction_id
      const routeCompare = a.route_long_name.localeCompare(b.route_long_name);
      if (routeCompare !== 0) return routeCompare;
      return a.direction_id - b.direction_id;
    });

    // Step 6: Log summary for verification
    console.log("\n=== SUMMARY ===");
    console.log(`Database routes: ${routeData.length}`);
    console.log(`Total trips: ${tripData.length}`);
    console.log(`Route-Direction combinations: ${routeDirectionGroups.size}`);
    console.log(`Final directions returned: ${directions.length}`);
    console.log("================\n");

    return directions;

  } catch (error) {
    console.error(
      `Error in getDirectionsByAgency for line ${lineBusInfo}, agency ${agencyId}:`,
      error
    );
    throw error;
  }
}

private static getDirectionName(
  tripHeadsign: string | null,
  firstStop: any,
  lastStop: any
): string {
  // Priority: use trip_headsign if exists and meaningful
  if (tripHeadsign && tripHeadsign.trim() && tripHeadsign.trim().length > 1) {
    return tripHeadsign.trim();
  }

  // Fallback: create name from stops
  const firstName = firstStop?.stop_name || "Unknown";
  const lastName = lastStop?.stop_name || "Unknown";
  
  // If same stop (circular route), use stop name
  if (firstName === lastName) {
    return firstName;
  }
  
  // Different stops - create arrow format
  return `${firstName} → ${lastName}`;
}

private static createStopInfo(stop: any, tripCount: number): StopInfo | null {
  if (!stop) return null;

  return {
    name: stop.stop_name || "Unknown Stop",
    stop_code: stop.stop_code || "",
    coordinates: {
      lat: stop.stop_lat || 0,
      lon: stop.stop_lon || 0
    },
    frequency: tripCount,
    reliability_percentage: "100", // Can be calculated based on actual data consistency
    description: ""
  };
}

private static getAlternativeHeadsigns(trips: any[]): string[] {
  const headsigns = new Set<string>();

  trips.forEach((trip) => {
    if (trip.trip_headsign && trip.trip_headsign.trim()) {
      headsigns.add(trip.trip_headsign.trim());
    }
  });

  return Array.from(headsigns).sort();
}
  static async getStopsForRoute(
    routeId: string,
    directionId: number,
    agencyId: string
  ): Promise<StopForTrip[]> {
    try {
      console.log(`Getting stops for route: ${routeId}, direction: ${directionId}`);

      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      // קבלת טיול מייצג לקו והכיוון הספציפיים
      const { data: tripData, error: tripError } = await supabase
        .from("rides")
        .select("trip_id")
        .eq("route_id", routeId)
        .eq("direction_id", directionId)
        .limit(1);

      if (tripError || !tripData || tripData.length === 0) {
        throw new Error(`No trips found for route ${routeId}, direction ${directionId}`);
      }

      const representativeTripId = tripData[0].trip_id;

      // קבלת כל התחנות לטיול הספציפי הזה עם הפרטים המלאים
      // תמיד בסדר עולה לפי stop_sequence (סדר הנסיעה הטבעי)
      const { data: stopTimes, error: stopError } = await supabase
        .from("stop_times")
        .select(`
          stop_sequence,
          stops (
            stop_id,
            stop_code,
            stop_name,
            stop_lat,
            stop_lon
          )
        `)
        .eq("trip_id", representativeTripId)
        .order("stop_sequence", { ascending: true });

      if (stopError) {
        throw new Error(`Error fetching stops: ${stopError.message}`);
      }

      if (!stopTimes || stopTimes.length === 0) {
        throw new Error(`No stops found for trip ${representativeTripId}`);
      }
// DEBUG: בואו נראה מה בעצם חוזר מהדאטהבייס
console.log('=== DEBUG stopTimes ===');
console.log('First stopTime object:', JSON.stringify(stopTimes[0], null, 2));
console.log('Type of stops:', typeof stopTimes[0].stops);
console.log('Is stops an array?', Array.isArray(stopTimes[0].stops));
console.log('========================');
// המרת הנתונים לפורמט הנדרש
const stops: StopForTrip[] = stopTimes.map((st) => {
  // תמיכה בשני מקרים - מערך או אובייקט
  const stop = Array.isArray(st.stops) ? st.stops[0] : st.stops;
  
  return {
    stop_id: stop?.stop_id,
    stop_code: stop?.stop_code || "",
    stop_name: stop?.stop_name || "Unknown Stop",
    stop_sequence: st.stop_sequence,
    coordinates: {
      lat: parseFloat(stop?.stop_lat) || 0,
      lon: parseFloat(stop?.stop_lon) || 0
    }
  };
});
      console.log(`Found ${stops.length} stops for route ${routeId}, direction ${directionId}`);
      return stops;

    } catch (error) {
      console.error(`Error in getStopsForRoute:`, error);
      throw error;
    }
  }

  static validateStopSequence(
    boardingStop: StopForTrip,
    alightingStop: StopForTrip
  ): boolean {
    return alightingStop.stop_sequence > boardingStop.stop_sequence;
  }
}