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

      // Get all trips for these routes in a single query
      const routeIds = routeData.map((route) => route.route_id);
      const { data: tripData, error: tripError } = await supabase
        .from("trips")
        .select("trip_id, direction_id, trip_headsign, route_id")
        .in("route_id", routeIds);

      if (tripError) throw new Error(`Trips query error: ${tripError.message}`);
      if (!tripData || tripData.length === 0) return [];

      // Group trips by direction_id and get representative trips
      const directionGroups = new Map<
        number,
        {
          trips: typeof tripData;
          route_long_name: string;
        }
      >();

      tripData.forEach((trip) => {
        const route = routeData.find((r) => r.route_id === trip.route_id);
        if (!route) return;

        if (!directionGroups.has(trip.direction_id)) {
          directionGroups.set(trip.direction_id, {
            trips: [],
            route_long_name: route.route_long_name
          });
        }
        directionGroups.get(trip.direction_id)!.trips.push(trip);
      });

      // Process each direction
      const directions: DirectionResult[] = [];

      for (const [directionId, group] of directionGroups) {
        // Use the first trip as representative for getting stop times
        const representativeTrip = group.trips[0];

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
        if (!stopTimes || stopTimes.length === 0) continue;

        const firstStop = stopTimes[0].stops;
        const lastStop = stopTimes[stopTimes.length - 1].stops;

        // Create direction result
        const direction: DirectionResult = {
          direction_id: directionId,
          direction_name: this.getDirectionName(
            representativeTrip.trip_headsign,
            firstStop,
            lastStop
          ),
          first_stop: this.createStopInfo(firstStop, group.trips.length),
          last_stop: this.createStopInfo(lastStop, group.trips.length),
          total_trips: group.trips.length,
          route_long_name: group.route_long_name || "",
          route_description: "",
          alternative_headsigns: this.getAlternativeHeadsigns(group.trips),
          common_patterns: ["simple"]
        };

        directions.push(direction);
      }

      console.log(
        `Successfully processed ${directions.length} directions for line ${lineBusInfo}`
      );
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
    if (tripHeadsign && tripHeadsign.trim()) {
      return tripHeadsign;
    }

    if (firstStop?.stop_name && lastStop?.stop_name) {
      return `${firstStop.stop_name} → ${lastStop.stop_name}`;
    }

    return "Unknown Direction";
  }

  private static createStopInfo(stop: any, tripCount: number): StopInfo | null {
    if (!stop) return null;

    return {
      name: stop.stop_name || "Unknown Stop",
      stop_code: stop.stop_code || "",
      coordinates: {
        lat: parseFloat(stop.stop_lat) || 0,
        lon: parseFloat(stop.stop_lon) || 0
      },
      frequency: tripCount,
      reliability_percentage: "100",
      description: ""
    };
  }

  private static getAlternativeHeadsigns(trips: any[]): string[] {
    const headsigns = new Set<string>();

    trips.forEach((trip) => {
      if (trip.trip_headsign && trip.trip_headsign.trim()) {
        headsigns.add(trip.trip_headsign);
      }
    });

    return Array.from(headsigns);
  }

  private static extractCitiesFromStops(stops: any[]): string[] {
    // Basic implementation - you might want to enhance this based on your data structure
    const cities = new Set<string>();

    stops.forEach((stop) => {
      if (stop?.stop_name) {
        // Extract city name from stop name if it follows a pattern like "Stop Name, City"
        const parts = stop.stop_name.split(",");
        if (parts.length > 1) {
          const city = parts[parts.length - 1].trim();
          if (city) cities.add(city);
        }
      }
    });

    return Array.from(cities);
  }

  // Additional utility method for batch processing multiple lines
  static async getMultipleDirections(
    lineAgencyPairs: Array<{ line: string; agencyId: string }>
  ): Promise<Map<string, DirectionResult[]>> {
    const results = new Map<string, DirectionResult[]>();

    // Process in batches to avoid overwhelming the database
    const batchSize = 5;
    for (let i = 0; i < lineAgencyPairs.length; i += batchSize) {
      const batch = lineAgencyPairs.slice(i, i + batchSize);

      const promises = batch.map(async ({ line, agencyId }) => {
        try {
          const directions = await this.getDirectionsByAgency(line, agencyId);
          return { key: `${line}-${agencyId}`, directions };
        } catch (error) {
          console.error(
            `Error processing line ${line}, agency ${agencyId}:`,
            error
          );
          return { key: `${line}-${agencyId}`, directions: [] };
        }
      });

      const batchResults = await Promise.all(promises);
      batchResults.forEach(({ key, directions }) => {
        results.set(key, directions);
      });
    }

    return results;
  }
}
