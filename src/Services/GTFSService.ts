import { supabase } from "../Config/Supabase";
import {
  Trip,
  StopTimeRow,
  StopData,
  StopInfo,
  DirectionResult
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

    // Get all routes for the line and agency
    const { data: routeData, error: routeError } = await supabase
      .from("routes")
      .select("route_id, route_short_name, route_long_name, agency_id")
      .eq("route_short_name", lineBusInfo)
      .eq("agency_id", agencyId);

    if (routeError)
      throw new Error(`Route query error: ${routeError.message}`);
    if (!routeData || routeData.length === 0) return [];

    console.log(`Found ${routeData.length} routes for line ${lineBusInfo}`);

    // Process each route separately to avoid mixing different lines
    const allDirections: DirectionResult[] = [];

    for (const route of routeData) {
      console.log(`Processing route: ${route.route_long_name}`);
      
      // Get trips only for this specific route
      const { data: tripData, error: tripError } = await supabase
        .from("trips")
        .select("trip_id, direction_id, trip_headsign")
        .eq("route_id", route.route_id);

      if (tripError) {
        console.error(`Trips query error for route ${route.route_id}:`, tripError.message);
        continue;
      }
      if (!tripData || tripData.length === 0) {
        console.log(`No trips found for route ${route.route_id}`);
        continue;
      }

      // Group trips by direction_id for this specific route
      const directionGroups = new Map<number, typeof tripData>();

      tripData.forEach((trip) => {
        if (!directionGroups.has(trip.direction_id)) {
          directionGroups.set(trip.direction_id, []);
        }
        directionGroups.get(trip.direction_id)!.push(trip);
      });

      // Process each direction for this route
      for (const [directionId, trips] of directionGroups) {
        console.log(`Processing direction ${directionId} with ${trips.length} trips`);
        
        // Use the first trip as representative for getting stop times
        const representativeTrip = trips[0];

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
          console.log(`No stops found for trip ${representativeTrip.trip_id}`);
          continue;
        }

        const firstStop = stopTimes[0].stops;
        const lastStop = stopTimes[stopTimes.length - 1].stops;

        // Create direction result with route-specific data
        const direction: DirectionResult = {
          direction_id: directionId,
          direction_name: this.getDirectionName(
            representativeTrip.trip_headsign,
            firstStop,
            lastStop
          ),
          first_stop: this.createStopInfo(firstStop, trips.length),
          last_stop: this.createStopInfo(lastStop, trips.length),
          total_trips: trips.length,
          route_long_name: route.route_long_name || "",
          route_description: `Route ID: ${route.route_id}`,
          // Only headsigns from this specific route
          alternative_headsigns: this.getAlternativeHeadsigns(trips),
          common_patterns: ["simple"]
        };

        allDirections.push(direction);
      }
    }

    console.log(
      `Successfully processed ${allDirections.length} directions for line ${lineBusInfo}`
    );
    
    // Sort by route_long_name and then direction_id for consistent ordering
    allDirections.sort((a, b) => {
      const routeCompare = a.route_long_name.localeCompare(b.route_long_name);
      if (routeCompare !== 0) return routeCompare;
      return a.direction_id - b.direction_id;
    });

    return allDirections;

  } catch (error) {
    console.error(
      `Error in getDirectionsByAgency for line ${lineBusInfo}, agency ${agencyId}:`,
      error
    );
    throw error;
  }
}
}
