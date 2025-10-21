import { log } from "console";
import { supabase } from "../Config/Supabase";
import { StopInfo, DirectionResult, StopForTrip } from "../Models/GTFS";
import { TripRequest } from "../Models/Trip";
import { TripService } from "./TripService";

export class GTFSService {
  static async getLineBusAgencies(lineBusInfo: string) {
    try {
      console.log(`Getting bus agencies for line: ${lineBusInfo}`);
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
      console.log("agencies:", agencies);
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
        console.log(
          `No routes found for line ${lineBusInfo}, agency ${agencyId}`
        );
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

      if (tripError) throw new Error(`Trips query error: ${tripError.message}`);
      if (!tripData || tripData.length === 0) {
        console.log(`No trips found for routes: ${routeIds}`);
        return [];
      }

      console.log(`Found ${tripData.length} total trips across all routes`);

      // Step 3: Group by route_id + direction_id combination
      const routeDirectionGroups = new Map<
        string, // key: "route_id-direction_id"
        {
          route: (typeof routeData)[0];
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

      console.log(
        `Created ${routeDirectionGroups.size} route-direction combinations`
      );

      // Step 4: Process each route-direction combination
      const directions: DirectionResult[] = [];

      for (const [key, group] of routeDirectionGroups) {
        console.log(
          `Processing ${key}: ${group.route.route_long_name} (Direction ${group.direction_id}) - ${group.trips.length} trips`
        );

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
          route_id: group.route.route_id,
          direction_name: this.getDirectionName(
            representativeTrip.trip_headsign,
            firstStop,
            lastStop
          ),
          first_stop: this.createStopInfo(firstStop, group.trips.length),
          last_stop: this.createStopInfo(lastStop, group.trips.length),
          total_trips: group.trips.length,
          route_long_name: group.route.route_long_name || "",
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
      console.log(
        `Getting stops for route: ${routeId}, direction: ${directionId}, agency: ${agencyId}`
      );

      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      // הוסף את agency_id לשאילתה לוודא שנקבל את הטיול הנכון
      const { data: tripData, error: tripError } = await supabase
        .from("trips")
      .select(`
        trip_id,
        routes!inner (
          route_id,
          agency_id
        )
      `)
      .eq("routes.route_id", routeId)
      .eq("direction_id", directionId)
      .eq("routes.agency_id", agencyId)
      .limit(1);

      if (tripError || !tripData || tripData.length === 0) {
        throw new Error(
          `No trips found for route ${routeId}, direction ${directionId}, agency ${agencyId}`
        );
      }

      const representativeTripId = tripData[0].trip_id;

      const { data: stopTimes, error: stopError } = await supabase
        .from("stop_times")
        .select(
          `
        stop_sequence,
        stops (
          stop_id,
          stop_code,
          stop_name,
          stop_lat,
          stop_lon
        )
      `
        )
        .eq("trip_id", representativeTripId)
        .order("stop_sequence", { ascending: true });

      if (stopError) {
        throw new Error(`Error fetching stops: ${stopError.message}`);
      }

      if (!stopTimes || stopTimes.length === 0) {
        throw new Error(`No stops found for trip ${representativeTripId}`);
      }

      const stops: StopForTrip[] = stopTimes.map((st) => {
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

      console.log(
        `Found ${stops.length} stops for route ${routeId}, direction ${directionId}`
      );
      return stops;
    } catch (error) {
      console.error(`Error in getStopsForRoute:`, error);
      throw error;
    }
  }
  static findStopByName(
    stops: StopForTrip[],
    searchName: string
  ): StopForTrip | null {
    const normalizedSearch = searchName.toLowerCase().trim();

    // חיפוש מדויק
    let found = stops.find((stop) =>
      stop.stop_name.toLowerCase().includes(normalizedSearch)
    );

    if (!found) {
      // חיפוש פחות מדויק - חיפוש מילים
      const searchWords = normalizedSearch.split(" ");
      found = stops.find((stop) => {
        const stopNameLower = stop.stop_name.toLowerCase();
        return searchWords.some((word) => stopNameLower.includes(word));
      });
    }

    return found || null;
  }


  // 4. פונקציה עזר לקבלת מספר קווים אפשריים (אם צריך)
  static async getAvailableRoutes(agencyId: string): Promise<any[]> {
    if (!supabase) {
      throw new Error("Supabase client not initialized");
    }

    const { data: routes, error } = await supabase
      .from("routes")
      .select("route_id, route_short_name, route_long_name")
      .eq("agency_id", agencyId)
      .order("route_short_name");

    if (error) {
      throw new Error(`Error fetching routes: ${error.message}`);
    }

    return routes || [];
  }

  // 5. דוגמה לשימוש במערכת IVR
  static async handleIVRTripCreation(ivrData: {
    userId: string;
    spokenRouteNumber: string; // "שלושים וחמש" או "35"
    spokenBoardingStop: string; // "אליהו הנביא אהרונסון"
    spokenAlightingStop: string; // "מחלף הרטוב"
    agencyId: string;
    directionId: number;
  }) {
    try {
      // המרת מספר קו מדבור לטקסט (תצטרך לממש זה בהתאם למערכת IVR שלך)
      const routeNumber = this.parseSpokenNumber(ivrData.spokenRouteNumber);

      // מציאת route_id לפי מספר הקו
      const { data: routeData, error: routeError } = await supabase
        .from("routes")
        .select("route_id, route_short_name")
        .eq("route_short_name", routeNumber)
        .eq("agency_id", ivrData.agencyId)
        .limit(1);
  const { TripService } = await import("./TripService");

      if (routeError || !routeData || routeData.length === 0) {
        throw new Error(`קו ${routeNumber} לא נמצא`);
      }

      const routeId = routeData[0].route_id;

      // יצירת הנסיעה
      const result = await TripService.createTripWithStopSelection({
        userId: ivrData.userId,
        routeId: routeId,
        directionId: ivrData.directionId,
        agencyId: ivrData.agencyId,
        lineNumber: routeNumber,
        boardingStopName: ivrData.spokenBoardingStop,
        alightingStopName: ivrData.spokenAlightingStop
      });

      return {
        success: true,
        message: `נסיעה נוצרה בהצלחה מ${result.boardingStop.stop_name} ל${result.alightingStop.stop_name}`,
        tripId: result.trip.id,
        confirmationCode: result.trip.confirmation_code,
        price: result.trip.amount
      };
    } catch (error) {
      console.error("Error in handleIVRTripCreation:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // 6. פונקציה עזר להמרת מספרים מדבור (דוגמה)
  static parseSpokenNumber(spokenNumber: string): string {
    const numberMap: { [key: string]: string } = {
      אחת: "1",
      שתיים: "2",
      שלוש: "3",
      ארבע: "4",
      חמש: "5",
      שש: "6",
      שבע: "7",
      שמונה: "8",
      תשע: "9",
      עשר: "10",
      עשרים: "20",
      שלושים: "30",
      ארבעים: "40",
      חמישים: "50"
      // הוסף עוד מספרים לפי הצורך
    };

    // אם זה כבר מספר - החזר כמו שהוא
    if (/^\d+$/.test(spokenNumber)) {
      return spokenNumber;
    }

    // נסה להמיר מילים למספרים
    let result = spokenNumber;
    Object.keys(numberMap).forEach((word) => {
      result = result.replace(new RegExp(word, "g"), numberMap[word]);
    });

    // טפל במקרים מורכבים כמו "שלושים וחמש"
    if (result.includes("ו")) {
      const parts = result.split("ו");
      if (parts.length === 2) {
        const tens = parseInt(parts[0]) || 0;
        const ones = parseInt(parts[1]) || 0;
        result = (tens + ones).toString();
      }
    }

    return result;
  }

  static validateStopSequence(
    boardingStop: StopForTrip,
    alightingStop: StopForTrip
  ): boolean {
    return alightingStop.stop_sequence > boardingStop.stop_sequence;
  }

  // הוסף את המתודות האלה ל-GTFSService.ts הקיים שלך
// אחרי המתודה handleIVRTripCreation

/**
 * חיפוש תחנה לפי מספר תחנה (stop_code)
 * שימושי למערכת IVR - המשתמש מקיש מספר תחנה
 */
static async searchStopByCode(stopCode: string): Promise<{
  stop_id: string;
  stop_code: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
} | null> {
  try {
    const { data, error } = await supabase
      .from("stops")
      .select("stop_id, stop_code, stop_name, stop_lat, stop_lon")
      .eq("stop_code", stopCode)
      .limit(1)
      .single();

    if (error || !data) {
      console.log(`❌ Stop not found for code: ${stopCode}`);
      return null;
    }

    console.log(`✅ Found stop: ${data.stop_name} (${data.stop_code})`);
    
    return {
      stop_id: data.stop_id,
      stop_code: data.stop_code,
      stop_name: data.stop_name,
      stop_lat: parseFloat(data.stop_lat),
      stop_lon: parseFloat(data.stop_lon)
    };
  } catch (error) {
    console.error("Error searching stop by code:", error);
    return null;
  }
}

/**
 * בדיקה אם תחנה נמצאת על מסלול מסוים
 * מחזיר גם את stop_sequence כדי לוודא סדר תחנות
 */
static async isStopOnRoute(
  stopId: string,
  routeId: string,
  directionId: number,
  agencyId: string
): Promise<{
  isOnRoute: boolean;
  stopSequence?: number;
}> {
  try {
    // שים לב: אנחנו עושים join ל-trips כדי לסנן לפי route_id ו-direction_id
    // agency_id לא נמצא ב-trips, אז אנחנו לא משתמשים בו כאן
    const { data, error } = await supabase
      .from("stop_times")
      .select(`
        stop_sequence,
        trips!inner (
          trip_id,
          route_id,
          direction_id
        )
      `)
      .eq("stop_id", stopId)
      .eq("trips.route_id", routeId)
      .eq("trips.direction_id", directionId)
      .limit(1);

    if (error) {
      console.error("Error in isStopOnRoute:", error);
      return { isOnRoute: false };
    }

    if (!data || data.length === 0) {
      return { isOnRoute: false };
    }

    return {
      isOnRoute: true,
      stopSequence: data[0].stop_sequence
    };
  } catch (error) {
    console.error("Error checking if stop is on route:", error);
    return { isOnRoute: false };
  }
}

/**
 * קבלת תחנה ראשונה ואחרונה של מסלול
 * חשוב למערכת IVR - אופציה "נסיעה מלאה"
 */
static async getFirstAndLastStops(
  routeId: string,
  directionId: number,
  agencyId: string
): Promise<{
  firstStop: {
    stop_id: string;
    stop_name: string;
    stop_code: string;
    stop_lat: number;
    stop_lon: number;
  };
  lastStop: {
    stop_id: string;
    stop_name: string;
    stop_code: string;
    stop_lat: number;
    stop_lon: number;
  };
}> {
  try {
    console.log(`🔍 Searching for trip with route: ${routeId}, direction: ${directionId}, agency: ${agencyId}`);
    
    // קבל trip אחד מייצג
    // שים לב: agency_id נמצא ב-routes, לא ב-trips!
    const { data: tripData, error: tripError } = await supabase
      .from("trips")
      .select("trip_id")
      .eq("route_id", routeId)
      .eq("direction_id", directionId)
      .limit(1);

    console.log(`Trip query result:`, { tripData, tripError });

    if (tripError) {
      console.error("Trip query error:", tripError);
      throw new Error(`Trip query failed: ${tripError.message}`);
    }

    if (!tripData || tripData.length === 0) {
      console.error("No trip found for the given parameters");
      throw new Error("No trip found for route");
    }

    const representativeTripId = tripData[0].trip_id;
    console.log(`✅ Found representative trip: ${representativeTripId}`);

    // קבל את כל התחנות למסלול הזה
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
      console.error("Stop times query error:", stopError);
      throw new Error(`Failed to get stops: ${stopError.message}`);
    }

    if (!stopTimes || stopTimes.length === 0) {
      console.error("No stops found for trip");
      throw new Error("No stops found for trip");
    }

    console.log(`✅ Found ${stopTimes.length} stops`);

    const firstStopData = stopTimes[0].stops;
    const lastStopData = stopTimes[stopTimes.length - 1].stops;

    // Supabase מחזיר stops כמערך או אובייקט, תלוי בגרסה
    const first = Array.isArray(firstStopData) ? firstStopData[0] : firstStopData;
    const last = Array.isArray(lastStopData) ? lastStopData[0] : lastStopData;

    if (!first || !last) {
      throw new Error("Invalid stop data structure");
    }

    console.log(`✅ First stop: ${first.stop_name}`);
    console.log(`✅ Last stop: ${last.stop_name}`);

    return {
      firstStop: {
        stop_id: first.stop_id,
        stop_name: first.stop_name,
        stop_code: first.stop_code || "",
        stop_lat: parseFloat(first.stop_lat),
        stop_lon: parseFloat(first.stop_lon)
      },
      lastStop: {
        stop_id: last.stop_id,
        stop_name: last.stop_name,
        stop_code: last.stop_code || "",
        stop_lat: parseFloat(last.stop_lat),
        stop_lon: parseFloat(last.stop_lon)
      }
    };
  } catch (error) {
    console.error("❌ Error getting first and last stops:", error);
    throw error;
  }
}

/**
 * יצירת נסיעה עם stop_id ישיר (במקום שמות תחנות)
 * משמש למערכת IVR עם מספרי תחנות
 */
static async createTripWithStopIds(params: {
  userId: string;
  routeId: string;
  directionId: number;
  agencyId: string;
  boardingStopId: string;
  alightingStopId: string;
}): Promise<{
  success: boolean;
  tripId?: string;
  confirmationCode?: string;
  price?: number;
  message?: string;
  details?: {
    boarding_stop_id: string;
    alighting_stop_id: string;
    boarding_coordinates: { lat: number; lon: number };
    alighting_coordinates: { lat: number; lon: number };
  };
}> {
  try {
    // קבל פרטי התחנות
    const [boardingResult, alightingResult] = await Promise.all([
      supabase
        .from("stops")
        .select("stop_id, stop_name, stop_lat, stop_lon")
        .eq("stop_id", params.boardingStopId)
        .single(),
      supabase
        .from("stops")
        .select("stop_id, stop_name, stop_lat, stop_lon")
        .eq("stop_id", params.alightingStopId)
        .single()
    ]);

    if (boardingResult.error || alightingResult.error) {
      return {
        success: false,
        message: "תחנות לא נמצאו במערכת"
      };
    }

    const boarding = boardingResult.data;
    const alighting = alightingResult.data;

    // בדוק שהתחנות על המסלול
    const [boardingCheck, alightingCheck] = await Promise.all([
      this.isStopOnRoute(params.boardingStopId, params.routeId, params.directionId, params.agencyId),
      this.isStopOnRoute(params.alightingStopId, params.routeId, params.directionId, params.agencyId)
    ]);

    if (!boardingCheck.isOnRoute || !alightingCheck.isOnRoute) {
      return {
        success: false,
        message: "אחת התחנות אינה על המסלול"
      };
    }

    if (boardingCheck.stopSequence! >= alightingCheck.stopSequence!) {
      return {
        success: false,
        message: "תחנת העלייה חייבת להיות לפני תחנת הירידה"
      };
    }

    // קבל את מספר הקו
    const { data: routeData } = await supabase
      .from("routes")
      .select("route_short_name")
      .eq("route_id", params.routeId)
      .single();

    const lineNumber = routeData?.route_short_name || "???";

    // השתמש ב-TripService הקיים ליצירת הנסיעה
    const tripRequest = {
      user_id: params.userId,
      line_number: lineNumber,
      agency_id: params.agencyId,
      route_id: params.routeId,
      direction_id: params.directionId,
      boarding_stop_id: params.boardingStopId,
      alighting_stop_id: params.alightingStopId,
      boarding_coordinates: {
        lat: parseFloat(boarding.stop_lat),
        lon: parseFloat(boarding.stop_lon)
      },
      alighting_coordinates: {
        lat: parseFloat(alighting.stop_lat),
        lon: parseFloat(alighting.stop_lon)
      },
      trip_date: new Date()
    };

    // השתמש ב-TripService.createTrip שכבר קיים
    const createdTrip = await TripService.createTrip(tripRequest);

    return {
      success: true,
      tripId: createdTrip.id,
      confirmationCode: createdTrip.confirmation_code,
      price: createdTrip.amount,
      details: {
        boarding_stop_id: params.boardingStopId,
        alighting_stop_id: params.alightingStopId,
        boarding_coordinates: {
          lat: parseFloat(boarding.stop_lat),
          lon: parseFloat(boarding.stop_lon)
        },
        alighting_coordinates: {
          lat: parseFloat(alighting.stop_lat),
          lon: parseFloat(alighting.stop_lon)
        }
      }
    };
  } catch (error) {
    console.error("Error creating trip with stop IDs:", error);
    return {
      success: false,
      message: "שגיאה ביצירת הנסיעה"
    };
  }
}
}
