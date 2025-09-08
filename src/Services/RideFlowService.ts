// import { supabase } from "../Config/Supabase";
// import { generateConfirmationCode } from "../Utils/Confirm";

// // שלב 1: בודק אם הקו קיים
// export async function askRoute(lineNumber: string | number) {
//   const { data: routes, error } = await supabase
//     .from("routes")
//     .select("route_id, route_long_name")
//     .eq("route_id", lineNumber)
//     .limit(1);

//   if (error) throw new Error(error.message);
//   if (!routes || routes.length === 0) return { step: "askRoute", error: "Route not found" };

//   return { step: "askDirection", routeId: lineNumber, routeName: routes[0].route_long_name };
// }

// // שלב 2: שולף את כיווני הקו
// export async function askDirection(routeId: string | number) {
//   const { data: directions, error } = await supabase
//     .from("trips")
//     .select("direction_id")
//     .eq("route_id", routeId)
   

//   if (error) throw new Error(error.message);
//   if (!directions || directions.length === 0) return { step: "askDirection", error: "No directions found" };

//   return { step: "askStops", routeId, options: directions.map(d => d.direction_id) };
// }

// // שלב 3: שולף את התחנות של הכיוון שנבחר
// export async function askStops(routeId: string | number, directionId: number) {
//   const { data: stops, error } = await supabase
//     .from("stop_times")
//     .select("stop_id, stop_name")
//     .eq("route_id", routeId)
//     .eq("direction_id", directionId)
//     .order("stop_sequence")
//     ;
//   if (error) throw new Error(error.message);
//   if (!stops || stops.length === 0) return { step: "askStops", error: "No stops found" };

//   return { step: "confirmRide", options: stops.map(s => ({ stopId: s.stop_id, stopName: s.stop_name })) };
// }

// // שלב 4: יוצר את הנסיעה עם התחנה הסופית והתחלתית
// export async function confirmRide(
//   userId: string,
//   routeId: string,
//   directionId: number,
//   fromStopId: string,
//   toStopId: string
// ) {
//   const code = generateConfirmationCode();
//   const expiresAt = new Date(Date.now() + 20 * 60000);

//   const { data: ride, error } = await supabase
//     .from("rides")
//     .insert({
//       user_id: userId,
//       line_number: routeId,
//       direction_id: directionId,
//       from_stop_id: fromStopId,
//       to_stop_id: toStopId,
//       confirmation_code: code,
//       expires_at: expiresAt,
//     })
//     .select("id, confirmation_code, start_time, expires_at")
//     .single();

//   if (error) throw new Error(error.message);

//   return { rideId: ride.id, confirmationCode: ride.confirmation_code, expiresAt: ride.expires_at };
// }
