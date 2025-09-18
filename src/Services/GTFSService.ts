import { supabase } from "../Config/Supabase";
import {
  Trip,
  StopTimeRow,
  StopData,
  DirectionResult,
  StopInfo
} from "../Models/GTFS";

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

  // static async getDirectionsByAgency(
  //   lineBusInfo: string,
  //   agencyId: string
  // ): Promise<DirectionResult[]> {
  //   try {
  //     console.log(`Attempting to get directions for line: ${lineBusInfo}, agency: ${agencyId}`);

  //     if (!supabase) {
  //       throw new Error('Supabase client not initialized');
  //     }

  //     // 1️⃣ קבלת כל ה-routes שמתאימים למספר הקו והחברה
  //     const { data: routeData, error: routeError } = await supabase
  //       .from('routes')
  //       .select('route_id, route_short_name, route_long_name, agency_id')
  //       .eq('route_short_name', lineBusInfo)
  //       .eq('agency_id', agencyId);

  //     if (routeError) throw new Error(`Route query error: ${routeError.message}`);
  //     if (!routeData || routeData.length === 0) return [];

  //     const directionMap = new Map<number, any>();

  //     // 2️⃣ מעבר על כל ה-routes כדי למצוא את כל ה-trips שלהם
  //     for (const route of routeData) {
  //       const { data: tripData, error: tripError } = await supabase
  //         .from('trips')
  //         .select('trip_id, direction_id, trip_headsign, route_id')
  //         .eq('route_id', route.route_id);

  //       if (tripError) {
  //         console.error(`Error fetching trips for route ${route.route_id}:`, tripError);
  //         continue;
  //       }
  //       if (!tripData || tripData.length === 0) continue;

  //       // 3️⃣ מעבר על כל ה-trips לבניית ה-directions
  //       for (const trip of tripData) {
  //         if (!directionMap.has(trip.direction_id)) {
  //           const { data: stopTimes, error: stopError } = await supabase
  //             .from('stop_times')
  //             .select(`
  //               stop_sequence,
  //               stops (
  //                 stop_code,
  //                 stop_name,
  //                 stop_lat,
  //                 stop_lon
  //               )
  //             `)
  //             .eq('trip_id', trip.trip_id)
  //             .order('stop_sequence', { ascending: true });

  //           if (stopError) {
  //             console.error(`Error fetching stop times for trip ${trip.trip_id}:`, stopError);
  //             continue;
  //           }
  //           if (!stopTimes || stopTimes.length === 0) continue;

  //           const firstStop = stopTimes[0].stops;
  //           const lastStop = stopTimes[stopTimes.length - 1].stops;

  //           directionMap.set(trip.direction_id, {
  //             direction_id: trip.direction_id,
  //             trip_headsign: trip.trip_headsign,
  //             first_stop: firstStop,
  //             last_stop: lastStop,
  //             trip_count: 1,
  //             route_long_name: route.route_long_name
  //           });
  //         } else {
  //           // עדכון מספר הנסיעות אם הכיוון כבר קיים
  //           const existing = directionMap.get(trip.direction_id);
  //           existing.trip_count++;
  //         }
  //       }
  //     }

  //     // 4️⃣ המרת המפה למערך DirectionResult
  //     const directions: DirectionResult[] = Array.from(directionMap.values()).map(dir => ({
  //       direction_id: dir.direction_id,
  //       direction_name: dir.trip_headsign || `${dir.first_stop?.stop_name} → ${dir.last_stop?.stop_name}`,
  //       first_stop: dir.first_stop ? {
  //         name: dir.first_stop.stop_name,
  //         stop_code: dir.first_stop.stop_code,
  //         coordinates: {
  //           lat: parseFloat(dir.first_stop.stop_lat),
  //           lon: parseFloat(dir.first_stop.stop_lon)
  //         },
  //         frequency: dir.trip_count,
  //         reliability_percentage: "100",
  //         description: ""
  //       } : null,
  //       last_stop: dir.last_stop ? {
  //         name: dir.last_stop.stop_name,
  //         stop_code: dir.last_stop.stop_code,
  //         coordinates: {
  //           lat: parseFloat(dir.last_stop.stop_lat),
  //           lon: parseFloat(dir.last_stop.stop_lon)
  //         },
  //         frequency: dir.trip_count,
  //         reliability_percentage: "100",
  //         description: ""
  //       } : null,
  //       total_trips: dir.trip_count,
  //       route_long_name: dir.route_long_name || "",
  //       route_description: "",
  //       alternative_headsigns: [],
  //       common_patterns: ["simple"]
  //     }));

  //     console.log(`Successfully processed ${directions.length} directions for line ${lineBusInfo}`);
  //     return directions;

  //   } catch (error) {
  //     console.error(`Error in getDirectionsByAgency for line ${lineBusInfo}, agency ${agencyId}:`, error);
  //     throw error;
  //   }
  // }
  // static async getDirectionsByAgency(
  //   lineBusInfo: string,
  //   agencyId: string
  // ): Promise<DirectionResult[]> {
  //   try {
  //     console.log(
  //       `Fetching directions for line ${lineBusInfo}, agency ${agencyId}`
  //     );

  //     if (!supabase) throw new Error("Supabase client not initialized");

  //     // קבלת כל המסלולים של הקו מהחברה
  //     const { data: routeData, error: routeError } = await supabase
  //       .from("routes")
  //       .select("route_id, route_short_name, route_long_name")
  //       .eq("route_short_name", lineBusInfo)
  //       .eq("agency_id", agencyId);

  //     if (routeError)
  //       throw new Error(`Route query error: ${routeError.message}`);
  //     if (!routeData || routeData.length === 0) return [];

  //     const routeIds = routeData.map((r) => r.route_id);

  //     // קבלת כל הטיולים של כל המסלולים
  //     const { data: tripData, error: tripError } = await supabase
  //       .from("trips")
  //       .select("trip_id, direction_id, trip_headsign, route_id")
  //       .in("route_id", routeIds);

  //     if (tripError) throw new Error(`Trip query error: ${tripError.message}`);
  //     if (!tripData || tripData.length === 0) return [];

  //     // Map לפי direction_id
  //     const directionMap = new Map<number, any>();

  //     // יוצרים array של promises עבור כל trip
  //     const promises = tripData.map(async (trip) => {
  //       if (!directionMap.has(trip.direction_id)) {
  //         const { data: stopTimes, error: stopError } = await supabase
  //           .from("stop_times")
  //           .select(
  //             `
  //           stop_sequence,
  //           stops (
  //             stop_code,
  //             stop_name,
  //             stop_lat,
  //             stop_lon
  //           )
  //         `
  //           )
  //           .eq("trip_id", trip.trip_id)
  //           .order("stop_sequence", { ascending: true });

  //         if (stopError || !stopTimes || stopTimes.length === 0) return;

  //         const firstStop = stopTimes[0].stops;
  //         const lastStop = stopTimes[stopTimes.length - 1].stops;

  //         directionMap.set(trip.direction_id, {
  //           direction_id: trip.direction_id,
  //           trip_headsign: trip.trip_headsign,
  //           first_stop: firstStop,
  //           last_stop: lastStop,
  //           trip_count: 1,
  //           route_long_name:
  //             routeData.find((r) => r.route_id === trip.route_id)
  //               ?.route_long_name || ""
  //         });
  //       } else {
  //         const existing = directionMap.get(trip.direction_id);
  //         existing.trip_count++;
  //       }
  //     });

  //     // מחכים שכל ה-promises ירוצו במקביל
  //     await Promise.all(promises);

  //     // המרה ל- DirectionResult[]
  //     const directions: DirectionResult[] = Array.from(
  //       directionMap.values()
  //     ).map((dir) => ({
  //       direction_id: dir.direction_id,
  //       direction_name:
  //         dir.trip_headsign ||
  //         `${dir.first_stop?.stop_name} → ${dir.last_stop?.stop_name}`,

  //       first_stop: dir.first_stop
  //         ? {
  //             name: dir.first_stop.stop_name,
  //             stop_code: dir.first_stop.stop_code,
  //             coordinates: {
  //               lat: parseFloat(dir.first_stop.stop_lat),
  //               lon: parseFloat(dir.first_stop.stop_lon)
  //             },
  //             frequency: dir.trip_count,
  //             reliability_percentage: "100",
  //             description: ""
  //           }
  //         : null,

  //       last_stop: dir.last_stop
  //         ? {
  //             name: dir.last_stop.stop_name,
  //             stop_code: dir.last_stop.stop_code,
  //             coordinates: {
  //               lat: parseFloat(dir.last_stop.stop_lat),
  //               lon: parseFloat(dir.last_stop.stop_lon)
  //             },
  //             frequency: dir.trip_count,
  //             reliability_percentage: "100",
  //             description: ""
  //           }
  //         : null,

  //       total_trips: dir.trip_count,
  //       route_long_name: dir.route_long_name,
  //       route_description: "",
  //       alternative_headsigns: [],
  //       common_patterns: ["simple"]
  //     }));

  //     console.log(
  //       `Found ${directions.length} directions for line ${lineBusInfo}`
  //     );
  //     return directions;
  //   } catch (error) {
  //     console.error(
  //       `Error fetching directions for line ${lineBusInfo}:`,
  //       error
  //     );
  //     throw error;
  //   }
  // }

  // static async getDirectionsByAgency(
  //   lineBusInfo: string,
  //   agencyId: string,
  //   cityFilter?: string
  // ): Promise<DirectionResult[]> {
  //   try {
  //     console.log(`Fetching directions for line ${lineBusInfo}, agency ${agencyId}`);

  //     // שלב 1: קבלת routes
  //     const { data: routes, error: routeError } = await supabase
  //       .from("routes")
  //       .select("route_id, route_short_name, route_long_name")
  //       .eq("route_short_name", lineBusInfo)
  //       .eq("agency_id", agencyId);

  //     if (routeError) throw new Error(`Route error: ${routeError.message}`);
  //     if (!routes || routes.length === 0) return [];

  //     console.log(`Found ${routes.length} routes`);
  //     const routeIds = routes.map(r => r.route_id);

  //     // שלב 2: קבלת trips
  //     const { data: trips, error: tripError } = await supabase
  //       .from("trips")
  //       .select("trip_id, direction_id, trip_headsign, route_id")
  //       .in("route_id", routeIds);

  //     if (tripError) throw new Error(`Trip error: ${tripError.message}`);
  //     if (!trips || trips.length === 0) return [];

  //     console.log(`Found ${trips.length} trips`);

  //     // שלב 3: עיבוד כל trip בנפרד
  //     const directionMap = new Map<number, {
  //       direction_id: number;
  //       headsigns: string[];
  //       first_stops: StopInfo[];
  //       last_stops: StopInfo[];
  //       trip_count: number;
  //       cities: Set<string>;
  //     }>();

  //     // עיבוד trips במקבצים קטנים כדי לא להעמיס על הDB
  //     const batchSize = 50;
  //     for (let i = 0; i < trips.length; i += batchSize) {
  //       const tripsBatch = trips.slice(i, i + batchSize);
  //       const tripIds = tripsBatch.map(t => t.trip_id);

  //       // קבלת stop_times לקבוצת trips הנוכחית
  //       const { data: stopTimes, error: stopError } = await supabase
  //         .from("stop_times")
  //         .select(`
  //           trip_id,
  //           stop_sequence,
  //           stops!inner (
  //             stop_code,
  //             stop_name,
  //             stop_lat,
  //             stop_lon
  //           )
  //         `)
  //         .in("trip_id", tripIds)
  //         .order("trip_id, stop_sequence");

  //       if (stopError) {
  //         console.warn(`Error getting stops for batch: ${stopError.message}`);
  //         continue;
  //       }

  //       if (!stopTimes) continue;

  //       // קיבוץ לפי trip_id
  //       const stopsByTrip = new Map<string, any[]>();
  //       stopTimes.forEach(st => {
  //         if (!stopsByTrip.has(st.trip_id)) {
  //           stopsByTrip.set(st.trip_id, []);
  //         }
  //         stopsByTrip.get(st.trip_id)!.push(st);
  //       });

  //       // עיבוד כל trip
  //       tripsBatch.forEach(trip => {
  //         const tripStops = stopsByTrip.get(trip.trip_id);
  //         if (!tripStops || tripStops.length === 0) return;

  //         // מיון לפי stop_sequence
  //         tripStops.sort((a, b) => a.stop_sequence - b.stop_sequence);

  //         const firstStop = tripStops[0]?.stops;
  //         const lastStop = tripStops[tripStops.length - 1]?.stops;

  //         if (!firstStop || !lastStop) return;

  //         // אתחול direction אם לא קיים
  //         if (!directionMap.has(trip.direction_id)) {
  //           directionMap.set(trip.direction_id, {
  //             direction_id: trip.direction_id,
  //             headsigns: [],
  //             first_stops: [],
  //             last_stops: [],
  //             trip_count: 0,
  //             cities: new Set()
  //           });
  //         }

  //         const dirInfo = directionMap.get(trip.direction_id)!;
  //         dirInfo.trip_count++;

  //         // הוספת headsign
  //         if (trip.trip_headsign) {
  //           dirInfo.headsigns.push(trip.trip_headsign.trim());
  //         }

  //         // הוספת תחנות
  //         dirInfo.first_stops.push(firstStop);
  //         dirInfo.last_stops.push(lastStop);

  //         // חילוץ ערים
  //         this.extractCities([firstStop, lastStop], dirInfo.cities);
  //       });
  //     }

  //     // שלב 4: יצירת התוצאות הסופיות
  //     const directions: DirectionResult[] = Array.from(directionMap.values()).map(dir => {
  //       // מציאת headsign הנפוץ ביותר
  //       const headsignCounts = new Map<string, number>();
  //       dir.headsigns.forEach(h => {
  //         headsignCounts.set(h, (headsignCounts.get(h) || 0) + 1);
  //       });

  //       const mostCommonHeadsign = Array.from(headsignCounts.entries())
  //         .sort((a, b) => b[1] - a[1])[0]?.[0];

  //       // מציאת תחנות הנפוצות ביותר
  //       const mostCommonFirstStop = this.findMostCommonStop(dir.first_stops);
  //       const mostCommonLastStop = this.findMostCommonStop(dir.last_stops);

  //       // יצירת שם כיוון
  //       let direction_name = mostCommonHeadsign || `כיוון ${dir.direction_id}`;
  //       if (!mostCommonHeadsign && mostCommonFirstStop && mostCommonLastStop) {
  //         direction_name = `${mostCommonFirstStop.stop_name} → ${mostCommonLastStop.stop_name}`;
  //       }

  //       // קביעת העיר (הראשונה מתוך הרשימה, או ריק)
  //       const city = Array.from(dir.cities)[0] || "";

  //       return {
  //         direction_id: dir.direction_id,
  //         direction_name,
  //         first_stop: mostCommonFirstStop ? {
  //           name: mostCommonFirstStop.stop_name,
  //           stop_code: mostCommonFirstStop.stop_code,
  //           coordinates: {
  //             lat: mostCommonFirstStop.stop_lat,
  //             lon: mostCommonFirstStop.stop_lon
  //           }
  //         } : null,
  //         last_stop: mostCommonLastStop ? {
  //           name: mostCommonLastStop.stop_name,
  //           stop_code: mostCommonLastStop.stop_code,
  //           coordinates: {
  //             lat: mostCommonLastStop.stop_lat,
  //             lon: mostCommonLastStop.stop_lon
  //           }
  //         } : null,
  //         total_trips: dir.trip_count,
  //         route_long_name: routes[0]?.route_long_name || "",
  //         cities: Array.from(dir.cities),
  //         city
  //       };
  //     });

  //     // פילטור לפי עיר אם נדרש
  //     let filteredDirections = directions;
  //     if (cityFilter) {
  //       filteredDirections = directions.filter(dir =>
  //         dir.cities.some(city => city.includes(cityFilter))
  //       );
  //     }

  //     console.log(`Found ${filteredDirections.length} directions`);
  //     return filteredDirections.sort((a, b) => a.direction_id - b.direction_id);

  //   } catch (error) {
  //     console.error(`Error in getDirectionsByAgency:`, error);
  //     throw error;
  //   }
  // }

  // // פונקציות עזר
  // static extractCities(stops: StopInfo[], citiesSet: Set<string>): void {
  //   const cityPatterns = [
  //     'אילת', 'חיפה', 'תל אביב', 'ירושלים', 'באר שבע', 'דימונה', 'חדרה',
  //     'נתניה', 'רעננה', 'פתח תקווה', 'בני ברק', 'רמת גן', 'הרצליה',
  //     'גדרה', 'רחובות', 'אשדוד', 'אשקלון', 'עפולה', 'נצרת', 'טבריה',
  //     'כרמיאל', 'עכו', 'נהריה', 'צפת', 'קרית שמונה', 'זכרון יעקב',
  //     'פרדס חנה', 'כרכור', 'בית שמש'
  //   ];

  //   stops.forEach(stop => {
  //     if (stop?.stop_name) {
  //       cityPatterns.forEach(city => {
  //         if (stop.stop_name.includes(city)) {
  //           citiesSet.add(city);
  //         }
  //       });
  //     }
  //   });
  // }

  // static findMostCommonStop(stops: StopInfo[]): StopInfo | null {
  //   if (stops.length === 0) return null;

  //   const stopCounts = new Map<string, { stop: StopInfo; count: number }>();

  //   stops.forEach(stop => {
  //     const key = `${stop.stop_name}-${stop.stop_code}`;
  //     if (stopCounts.has(key)) {
  //       stopCounts.get(key)!.count++;
  //     } else {
  //       stopCounts.set(key, { stop, count: 1 });
  //     }
  //   });

  //   const mostCommon = Array.from(stopCounts.values())
  //     .sort((a, b) => b.count - a.count)[0];

  //   return mostCommon?.stop || null;
  // }

  // // פונקציות נוספות
  // static async getDirectionsByCity(
  //   lineBusInfo: string,
  //   agencyId: string,
  //   cityName: string
  // ): Promise<DirectionResult[]> {
  //   return this.getDirectionsByAgency(lineBusInfo, agencyId, cityName);
  // }

  // static async getCitiesForLine(
  //   lineBusInfo: string,
  //   agencyId: string
  // ): Promise<string[]> {
  //   const directions = await this.getDirectionsByAgency(lineBusInfo, agencyId);
  //   const allCities = new Set<string>();

  //   directions.forEach(dir => {
  //     dir.cities.forEach(city => allCities.add(city));
  //   });

  //   return Array.from(allCities).sort();
  // }}
  static async getDirectionsByAgency(
    lineBusInfo: string,
    agencyId: string
  ): Promise<DirectionResult[]> {
    try {
      console.log(
        `Fetching directions for line ${lineBusInfo}, agency ${agencyId}`
      );

      if (!supabase) throw new Error("Supabase client not initialized");

      // שלב 1: קבלת מסלולים
      const { data: routeData, error: routeError } = await supabase
        .from("routes")
        .select("route_id, route_short_name, route_long_name")
        .eq("route_short_name", lineBusInfo)
        .eq("agency_id", agencyId);

      if (routeError)
        throw new Error(`Route query error: ${routeError.message}`);
      if (!routeData || routeData.length === 0) return [];

      console.log(`Found ${routeData.length} routes for line ${lineBusInfo}`);
      const routeIds = routeData.map((r) => r.route_id);

      // שלב 2: קבלת trips עם stop_times
      const { data: tripsWithStops, error: tripsError } = await supabase
        .from("trips")
        .select(
          `
        trip_id,
        direction_id,
        trip_headsign,
        route_id,
        stop_times!inner (
          stop_sequence,
          stops!inner (
            stop_code,
            stop_name,
            stop_lat,
            stop_lon
          )
        )
      `
        )
        .in("route_id", routeIds);

      if (tripsError)
        throw new Error(`Trips query error: ${tripsError.message}`);
      if (!tripsWithStops || tripsWithStops.length === 0) return [];

      console.log(`Found ${tripsWithStops.length} trips with stops`);

      // שלב 3: עיבוד נתונים לפי עיר וכיוון
      const cityDirectionMap = new Map<
        string,
        {
          direction_id: number;
          city: string;
          trip_headsigns: Set<string>;
          trip_count: number;
          stops: any[];
          route_long_names: Set<string>;
        }
      >();

      // רשימת ערים לזיהוי
      const cityPatterns = [
        "אילת",
        "חיפה",
        "תל אביב",
        "ירושלים",
        "באר שבע",
        "דימונה",
        "חדרה",
        "נתניה",
        "רעננה",
        "פתח תקווה",
        "בני ברק",
        "רמת גן",
        "הרצליה",
        "גדרה",
        "רחובות",
        "אשדוד",
        "אשקלון",
        "עפולה",
        "נצרת",
        "טבריה",
        "כרמיאל",
        "עכו",
        "נהריה",
        "צפת",
        "קרית שמונה",
        "זכרון יעקב",
        "פרדס חנה",
        "כרכור",
        "חפציבה",
        "בית שמש"
      ];

      for (const trip of tripsWithStops) {
        if (!trip.stop_times || trip.stop_times.length === 0) continue;

        const route = routeData.find((r) => r.route_id === trip.route_id);
       const sortedStops = trip.stop_times.sort(
  (a, b) => a.stop_sequence - b.stop_sequence
);

// זיהוי עיר בעיקר מהתחנות (זה הכי מדויק)
const detectedCities = new Set<string>();

// חיפוש בתחנות - זה המקור העיקרי
const citiesFromStops = new Set<string>();
sortedStops.map((st) => {
  if (st.stops?.length > 0 && st.stops[0].stop_name) {
    cityPatterns.forEach((city) => {
      if (
        st.stops[0]?.stop_name &&
        st.stops[0].stop_name.includes(city)
      ) {
        citiesFromStops.add(city);
      }
    });
  }
});

// אם נמצאו ערים בתחנות - השתמש רק בהן
if (citiesFromStops.size > 0) {
  citiesFromStops.forEach((city) => detectedCities.add(city));
} else {
  // רק אם לא נמצאו ערים בתחנות - תחפש בשם המסלול
  if (route?.route_long_name) {
    cityPatterns.forEach((city) => {
      if (route.route_long_name.includes(city)) {
        detectedCities.add(city);
      }
    });
  }
}

        // יצירת רשומה עבור כל עיר שזוהתה
        detectedCities.forEach((city) => {
          // וידוא שהעיר באמת תואמת לתחנות
          const cityMatchesStops = sortedStops.some((st) =>
            st.stops?.some(
              (stop) => stop.stop_name && stop.stop_name.includes(city)
            )
          );

          // רק אם העיר באמת מופיעה בתחנות
          if (cityMatchesStops) {
            const key = `${city}-${trip.direction_id}`;

            if (!cityDirectionMap.has(key)) {
              cityDirectionMap.set(key, {
                direction_id: trip.direction_id,
                city: city,
                trip_headsigns: new Set(),
                trip_count: 0,
                stops: sortedStops,
                route_long_names: new Set()
              });
            }

            const cityDir = cityDirectionMap.get(key)!;
            cityDir.trip_count++;

            if (trip.trip_headsign) {
              cityDir.trip_headsigns.add(trip.trip_headsign);
            }

            if (route?.route_long_name) {
              cityDir.route_long_names.add(route.route_long_name);
            }
          }
        });
      }

      // שלב 4: סינון כפילויות לפי תחנות בפועל
      const uniqueDirections = new Map<string, DirectionResult>();

      for (const [key, cityDir] of cityDirectionMap) {
        if (cityDir.stops.length === 0) continue;

        const firstStop = cityDir.stops[0]?.stops;
        const lastStop = cityDir.stops[cityDir.stops.length - 1]?.stops;

        if (!firstStop || !lastStop) continue;

        // יצירת מפתח ייחודי בהתבסס על תחנות בפועל
        const stopsKey = `${firstStop.stop_code}-${lastStop.stop_code}-${cityDir.direction_id}`;

        // אם כבר יש כיוון עם אותן תחנות - נאגד אותם
        const existingDirection = Array.from(uniqueDirections.values()).find(
          (d) =>
            d.first_stop.stop_code === firstStop.stop_code &&
            d.last_stop.stop_code === lastStop.stop_code &&
            d.direction_id === cityDir.direction_id
        );

        if (existingDirection) {
          // איגוד עם כיוון קיים - נוסיף את העיר לרשימה אם היא לא קיימת
          existingDirection.total_trips += cityDir.trip_count;
          if (
            !existingDirection.route_long_name.includes(
              Array.from(cityDir.route_long_names).join(" | ")
            )
          ) {
            existingDirection.route_long_name += ` | ${Array.from(
              cityDir.route_long_names
            ).join(" | ")}`;
          }
        } else {
          // יצירת כיוון חדש
          let directionName = "";
          if (cityDir.trip_headsigns.size > 0) {
            directionName = Array.from(cityDir.trip_headsigns).sort(
              (a, b) => b.length - a.length
            )[0];
          } else {
            directionName = `${firstStop.stop_name} → ${lastStop.stop_name}`;
          }

          const newDirection: DirectionResult = {
            direction_id: cityDir.direction_id,
            direction_name: directionName,
            city: cityDir.city,
            first_stop: {
              name: firstStop.stop_name,
              stop_code: firstStop.stop_code,
              coordinates: {
                lat: parseFloat(firstStop.stop_lat),
                lon: parseFloat(firstStop.stop_lon)
              }
            },
            last_stop: {
              name: lastStop.stop_name,
              stop_code: lastStop.stop_code,
              coordinates: {
                lat: parseFloat(lastStop.stop_lat),
                lon: parseFloat(lastStop.stop_lon)
              }
            },
            total_trips: cityDir.trip_count,
            route_long_name: Array.from(cityDir.route_long_names).join(" | ")
          };

          uniqueDirections.set(stopsKey, newDirection);
        }
      }

      const directions = Array.from(uniqueDirections.values());

      // מיון לפי עיר ואז כיוון
      directions.sort((a, b) => {
        const cityCompare = a.city.localeCompare(b.city, "he");
        if (cityCompare !== 0) return cityCompare;
        return a.direction_id - b.direction_id;
      });

      console.log(
        `Processed ${directions.length} directions for line ${lineBusInfo}`
      );

      // לוג ברור
      const citiesSummary = new Map<string, number[]>();
      directions.forEach((dir) => {
        if (!citiesSummary.has(dir.city)) {
          citiesSummary.set(dir.city, []);
        }
        citiesSummary.get(dir.city)!.push(dir.direction_id);
      });

      citiesSummary.forEach((directionIds, city) => {
        console.log(`${city}: directions ${directionIds.join(", ")}`);
      });

      return directions;
    } catch (error) {
      console.error(
        `Error fetching directions for line ${lineBusInfo}:`,
        error
      );
      throw error;
    }
  }
}
