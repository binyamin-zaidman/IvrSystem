import { supabase } from "../Config/Supabase";
import { TripDirection, StopTimeRow } from "../Models/GTFS";

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

static async getDirectionsByAgency(lineBusInfo: string, agencyId: string) {
  // שליפת route_id
  const { data: routes, error: routeError } = await supabase
    .from("routes")
    .select("route_id")
    .eq("route_short_name", lineBusInfo)
    .eq("agency_id", agencyId);

  if (routeError) throw new Error(routeError.message);
  if (!routes?.length) return [];

  const routeIds = routes.map(r => r.route_id);

  // שליפת trips כולל headsign
  const { data: trips, error: tripsError } = await supabase
    .from("trips")
    .select("trip_id, direction_id, trip_headsign")
    .in("route_id", routeIds);

  if (tripsError) throw new Error(tripsError.message);
  if (!trips?.length) return [];

  const tripIds = trips.map(t => t.trip_id);

  // שליפת stop_times
  const { data: stopTimes, error: stopTimesError } = await supabase
    .from("stop_times")
    .select("trip_id, stop_sequence, stop_id")
    .in("trip_id", tripIds);

  if (stopTimesError) throw new Error(stopTimesError.message);
  if (!stopTimes?.length) return [];

  // שליפת stops (שמות תחנות)
  const stopIds = [...new Set(stopTimes.map(st => st.stop_id))];
  const { data: stops, error: stopsError } = await supabase
    .from("stops")
    .select("stop_id, stop_name")
    .in("stop_id", stopIds);

  if (stopsError) throw new Error(stopsError.message);

  const stopIdToName = new Map<string, string>(
    (stops || []).map(s => [s.stop_id, s.stop_name])
  );

  // קיבוץ stop_times לפי trip
  const stopTimesByTrip = new Map<string, typeof stopTimes>();
  for (const st of stopTimes) {
    if (!stopTimesByTrip.has(st.trip_id)) stopTimesByTrip.set(st.trip_id, []);
    stopTimesByTrip.get(st.trip_id)!.push(st);
  }

  // מבני נתונים לסטטיסטיקה
  const firstStopFrequency = new Map<number, Map<string, number>>();
  const lastStopFrequency = new Map<number, Map<string, number>>();

  for (const trip of trips) {
    const stopsForTrip = stopTimesByTrip.get(trip.trip_id) || [];
    if (!stopsForTrip.length) continue;

    // מיון מקומי לפי sequence
    stopsForTrip.sort((a, b) => a.stop_sequence - b.stop_sequence);

    const firstStopId = stopsForTrip[0].stop_id;
    const lastStopId = stopsForTrip[stopsForTrip.length - 1].stop_id;

    const firstStopName = stopIdToName.get(firstStopId) || "";
    const lastStopName = stopIdToName.get(lastStopId) || "";

    // עדכון frequency
    if (!firstStopFrequency.has(trip.direction_id)) {
      firstStopFrequency.set(trip.direction_id, new Map());
      lastStopFrequency.set(trip.direction_id, new Map());
    }

    const firstMap = firstStopFrequency.get(trip.direction_id)!;
    const lastMap = lastStopFrequency.get(trip.direction_id)!;

    firstMap.set(firstStopName, (firstMap.get(firstStopName) || 0) + 1);
    lastMap.set(lastStopName, (lastMap.get(lastStopName) || 0) + 1);
  }

  // יצירת תוצאה
  const directions = Array.from(firstStopFrequency.keys()).map(directionId => {
    const firstMap = firstStopFrequency.get(directionId)!;
    const lastMap = lastStopFrequency.get(directionId)!;

    const mostCommonFirst = [...firstMap.entries()]
      .reduce((a, b) => (a[1] > b[1] ? a : b))[0];

    const mostCommonLast = [...lastMap.entries()]
      .reduce((a, b) => (a[1] > b[1] ? a : b))[0];

    const sampleTrip = trips.find(t => t.direction_id === directionId);

    return {
      direction_id: directionId,
      trip_id: sampleTrip?.trip_id || "",
      first_stop: mostCommonFirst,
      last_stop: mostCommonLast,
      headsign: sampleTrip?.trip_headsign || null, // אופציונלי
      debug_info: {
        total_trips: [...firstMap.values()].reduce((a, b) => a + b, 0),
      }
    };
  });

  return directions.sort((a, b) => a.direction_id - b.direction_id);
}

}
