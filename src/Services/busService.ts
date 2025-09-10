import { supabase } from "../Config/Supabase";

export async function getBusInfoWithDirections(
  lineBusInfo: string,
  agencyId?: string
) {
  // 1️⃣ שליפת כל הקווים עם אותו route_short_name
  let query = supabase
    .from("routes")
    .select("route_id, route_short_name, agency_id");

  query = query.eq("route_short_name", lineBusInfo);
  if (agencyId) query = query.eq("agency_id", agencyId);

  const { data: routesData, error: routesError } = await query;
  if (routesError) throw new Error(routesError.message);
  if (!routesData || routesData.length === 0)
    throw new Error("No bus info found");

  const results: any[] = [];

  // 2️⃣ עבור כל route_id, שליפת trips ייחודיים
  for (const route of routesData) {
    const { data: trips, error: tripsError } = await supabase
      .from("trips")
      .select("trip_id, direction_id")
      .eq("route_id", route.route_id);

    if (tripsError) continue;
    if (!trips || trips.length === 0) continue;

    // 3️⃣ ייחודיות של direction_id
    const uniqueDirections = [...new Set(trips.map((t) => t.direction_id))];
    const directions: { direction_id: number; from: string; to: string }[] = [];

    for (const dir of uniqueDirections) {
      // שליפת trip אחד לכל direction_id
      const trip = trips.find((t) => t.direction_id === dir);
      if (!trip) continue;

      // 4️⃣ שליפת תחנה ראשונה ואחרונה בלבד (ORDER BY stop_sequence ASC/DESC + LIMIT 1)
      const { data: firstStop, error: firstError } = await supabase
        .from("stop_times")
        .select("stop_id")
        .eq("trip_id", trip.trip_id)
        .order("stop_sequence", { ascending: true })
        .limit(1)
        .single();

      const { data: lastStop, error: lastError } = await supabase
        .from("stop_times")
        .select("stop_id")
        .eq("trip_id", trip.trip_id)
        .order("stop_sequence", { ascending: false })
        .limit(1)
        .single();

      if (firstError || lastError) continue;

      // 5️⃣ שליפת שם התחנה מהטבלה stops
      const { data: fromStopData } = await supabase
        .from("stops")
        .select("stop_name")
        .eq("stop_id", firstStop.stop_id)
        .single();

      const { data: toStopData } = await supabase
        .from("stops")
        .select("stop_name")
        .eq("stop_id", lastStop.stop_id)
        .single();

      directions.push({
        direction_id: dir,
        from: fromStopData?.stop_name || "Unknown",
        to: toStopData?.stop_name || "Unknown"
      });
    }

    results.push({
      route_id: route.route_id,
      line_bus: route.route_short_name,
      agency_id: route.agency_id,
      directions
    });
  }

  return results;
}
