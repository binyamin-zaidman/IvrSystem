import { supabase } from "../Config/Supabase";
import { Trip, StopTimeRow, StopData,StopInfo, DirectionResult } from "../Models/GTFS";

export class GTFSService {
  static async getLineBusAgencies(lineBusInfo: string) {
    const { data, error } = await supabase
      .from("routes")
      .select("agency_id,route_long_name")
      .eq("route_short_name", lineBusInfo);
    console.log(data);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return [];

    const uniqueAgencyIds = [...new Set(data.map((r) => r.agency_id))];

    const { data: agencies, error: agencyError } = await supabase
      .from("agency")
      .select("agency_id, agency_name")
      .in("agency_id", uniqueAgencyIds);

    if (agencyError) throw new Error(agencyError.message);

    return agencies || [];
  }

  static async getDirectionsByAgency(
    lineBusInfo: string,
    agencyId: string
  ): Promise<DirectionResult[]> {
    try {
      console.log(`Attempting to get directions for line: ${lineBusInfo}, agency: ${agencyId}`);

      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      // 1️⃣ קבלת כל ה-routes שמתאימים למספר הקו והחברה
      const { data: routeData, error: routeError } = await supabase
        .from('routes')
        .select('route_id, route_short_name, route_long_name, agency_id')
        .eq('route_short_name', lineBusInfo)
        .eq('agency_id', agencyId);

      if (routeError) throw new Error(`Route query error: ${routeError.message}`);
      if (!routeData || routeData.length === 0) return [];

      const directionMap = new Map<number, any>();

      // 2️⃣ מעבר על כל ה-routes כדי למצוא את כל ה-trips שלהם
      for (const route of routeData) {
        const { data: tripData, error: tripError } = await supabase
          .from('trips')
          .select('trip_id, direction_id, trip_headsign, route_id')
          .eq('route_id', route.route_id);

        if (tripError) {
          console.error(`Error fetching trips for route ${route.route_id}:`, tripError);
          continue;
        }
        if (!tripData || tripData.length === 0) continue;

        // 3️⃣ מעבר על כל ה-trips לבניית ה-directions
        for (const trip of tripData) {
          if (!directionMap.has(trip.direction_id)) {
            const { data: stopTimes, error: stopError } = await supabase
              .from('stop_times')
              .select(`
                stop_sequence,
                stops (
                  stop_code,
                  stop_name,
                  stop_lat,
                  stop_lon
                )
              `)
              .eq('trip_id', trip.trip_id)
              .order('stop_sequence', { ascending: true });

            if (stopError) {
              console.error(`Error fetching stop times for trip ${trip.trip_id}:`, stopError);
              continue;
            }
            if (!stopTimes || stopTimes.length === 0) continue;

            const firstStop = stopTimes[0].stops;
            const lastStop = stopTimes[stopTimes.length - 1].stops;

            directionMap.set(trip.direction_id, {
              direction_id: trip.direction_id,
              trip_headsign: trip.trip_headsign,
              first_stop: firstStop,
              last_stop: lastStop,
              trip_count: 1,
              route_long_name: route.route_long_name
            });
          } else {
            // עדכון מספר הנסיעות אם הכיוון כבר קיים
            const existing = directionMap.get(trip.direction_id);
            existing.trip_count++;
          }
        }
      }

      // 4️⃣ המרת המפה למערך DirectionResult
      const directions: DirectionResult[] = Array.from(directionMap.values()).map(dir => ({
        direction_id: dir.direction_id,
        direction_name: dir.trip_headsign || `${dir.first_stop?.stop_name} → ${dir.last_stop?.stop_name}`,
        first_stop: dir.first_stop ? {
          name: dir.first_stop.stop_name,
          stop_code: dir.first_stop.stop_code,
          coordinates: {
            lat: parseFloat(dir.first_stop.stop_lat),
            lon: parseFloat(dir.first_stop.stop_lon)
          },
          frequency: dir.trip_count,
          reliability_percentage: "100",
          description: ""
        } : null,
        last_stop: dir.last_stop ? {
          name: dir.last_stop.stop_name,
          stop_code: dir.last_stop.stop_code,
          coordinates: {
            lat: parseFloat(dir.last_stop.stop_lat),
            lon: parseFloat(dir.last_stop.stop_lon)
          },
          frequency: dir.trip_count,
          reliability_percentage: "100",
          description: ""
        } : null,
        total_trips: dir.trip_count,
        route_long_name: dir.route_long_name || "",
        route_description: "",
        alternative_headsigns: [],
        common_patterns: ["simple"],
        cities: [] // Add this property to satisfy DirectionResult type
      }));

      console.log(`Successfully processed ${directions.length} directions for line ${lineBusInfo}`);
      return directions;

    } catch (error) {
      console.error(`Error in getDirectionsByAgency for line ${lineBusInfo}, agency ${agencyId}:`, error);
      throw error;
    }
  }
}