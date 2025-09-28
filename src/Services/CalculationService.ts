import { supabase } from "../Config/Supabase";

export class CalculationService {
  private db: any;

  constructor(dbClient: any) {
    this.db = dbClient;
  }
  
  // שיטת חישוב תעריף משופרת
  static async calculateFareImproved(
    routeId: string | null,
    boardingStopId: string,
    alightingStopId: string,
    agencyId?: string
  ): Promise<{ price: number; fareId: string; method: string }> {
    
    const DEFAULT_FARE = { price: 8.0, fareId: "201", method: "default" };
    
    try {
      console.log(`Calculating fare for route: ${routeId}, from: ${boardingStopId} to: ${alightingStopId}`);
      
      // שלב 1: חישוב לפי מרחק גיאוגרפי (העיקרי)
      const distanceFare = await this.getFareByDistance(boardingStopId, alightingStopId);
      if (distanceFare) {
        console.log(`Found distance-based fare: ${distanceFare.price} (${distanceFare.fareId})`);
        return { ...distanceFare, method: "distance_based" };
      }
      
      // שלב 2: נסה לזהות לפי origin-destination (אם fare_rules קיים)
      const odFare = await this.getFareByOriginDestination(boardingStopId, alightingStopId);
      if (odFare) {
        console.log(`Found origin-destination fare: ${odFare.price} (${odFare.fareId})`);
        return { ...odFare, method: "origin_destination" };
      }
      
      // שלב 3: נסה לזהות לפי fare_rules (אם קיים)
      if (routeId) {
        const routeFare = await this.getFareByRoute(routeId);
        if (routeFare) {
          console.log(`Found route-based fare: ${routeFare.price} (${routeFare.fareId})`);
          return { ...routeFare, method: "route_based" };
        }
      }
      
      // שלב 4: חישוב לפי zone_id כגיבוי
      const zoneFare = await this.getFareByZones(boardingStopId, alightingStopId);
      if (zoneFare) {
        console.log(`Found zone-based fare: ${zoneFare.price} (${zoneFare.fareId})`);
        return { ...zoneFare, method: "zone_based" };
      }
      
      console.warn(`No specific fare found for route ${routeId}, stops ${boardingStopId}->${alightingStopId}`);
      return { ...DEFAULT_FARE, method: "fallback" };
      
    } catch (error) {
      console.error("Error in fare calculation:", error);
      return { ...DEFAULT_FARE, method: "error_fallback" };
    }
  }

// חישוב תעריף לפי קו
static async getFareByRoute(routeId: string): Promise<{ price: number; fareId: string } | null> {
  // Note: supabase is used here for static context
  try {
    const { data, error } = await supabase
      .from('fare_rules')
      .select(`
        fare_id,
        fare_attributes(price)
      `)
      .eq('route_id', routeId)
      .limit(1);

    if (error) {
      console.error("Error fetching fare by route:", error);
      return null;
    }

    if (data && data.length > 0 && data[0].fare_attributes) {
      return {
        price: parseFloat(data[0].fare_attributes[0].price),
        fareId: data[0].fare_id
      };
    }
  } catch (error) {
    console.error("Error fetching fare by route:", error);
  }

  return null;
}

  // חישוב תעריף לפי origin-destination  
  static async getFareByOriginDestination(
    originId: string, 
    destinationId: string
  ): Promise<{ price: number; fareId: string } | null> {
    try {
      const { data, error } = await supabase
        .from('fare_rules')
        .select(`
          fare_id,
          fare_attributes(price)
        `)
        .eq('origin_id', originId)
        .eq('destination_id', destinationId)
        .limit(1);
      
      if (error) {
        console.error("Error fetching fare by origin-destination:", error);
        return null;
      }
      
      if (data && data.length > 0 && data[0].fare_attributes) {
        return {
          price: parseFloat(data[0].fare_attributes[0].price),
          fareId: data[0].fare_id
        };
      }
    } catch (error) {
      console.error("Error fetching fare by origin-destination:", error);
    }
    
    return null;
  }

  // חישוב תעריף לפי אזורים - גרסה משופרת
  static async getFareByZones(
    boardingStopId: string,
    alightingStopId: string
  ): Promise<{ price: number; fareId: string } | null> {
    
    try {
      // קבל את zone_id של התחנות
      const { data: originStop, error: originError } = await supabase
        .from('stops')
        .select('zone_id, stop_name, stop_lat, stop_lon')
        .eq('stop_id', boardingStopId)
        .single();
      
      const { data: destinationStop, error: destError } = await supabase
        .from('stops')
        .select('zone_id, stop_name, stop_lat, stop_lon')
        .eq('stop_id', alightingStopId)
        .single();
      
      if (originError || destError || !originStop?.zone_id || !destinationStop?.zone_id) {
        console.log("Missing zone_id data for stops");
        return null;
      }
      
      console.log(`Origin: ${originStop.stop_name} (Zone: ${originStop.zone_id})`);
      console.log(`Destination: ${destinationStop.stop_name} (Zone: ${destinationStop.zone_id})`);
      
      // במקום הפרש מתמטי, נעבור לחישוב מרחק או לוגיקה אחרת
      // אם zone_id זהה - תעריף בסיסי
      if (originStop.zone_id === destinationStop.zone_id) {
        const fareId = "201"; // 8 שקל
        
        const { data: fareData, error: fareError } = await supabase
          .from('fare_attributes')
          .select('fare_id, price')
          .eq('fare_id', fareId)
          .single();
        
        if (fareData) {
          console.log(`Same zone travel - using basic fare: ${fareData.price}`);
          return {
            price: parseFloat(fareData.price),
            fareId: fareData.fare_id
          };
        }
      }
      
      // אם zone_id שונה - נחשב לפי מרחק גיאוגרפי
      const lat1 = parseFloat(originStop.stop_lat);
      const lon1 = parseFloat(originStop.stop_lon);
      const lat2 = parseFloat(destinationStop.stop_lat);
      const lon2 = parseFloat(destinationStop.stop_lon);
      
      const distance = this.calculateDistance(lat1, lon1, lat2, lon2);
      console.log(`Distance between zones: ${distance.toFixed(2)} km`);
      
      // לוגיקה משופרת לפי מרחק בין אזורים
      let fareId: string;
      if (distance < 15) {
        fareId = "202"; // 14.50 שקל - מרחק קצר-בינוני
      } else if (distance < 35) {
        fareId = "204"; // 19 שקל - מרחק בינוני-רחוק
      } else if (distance < 60) {
        fareId = "205"; // 30.50 שקל - מרחק רחוק
      } else {
        fareId = "212"; // 21 שקל - מרחק מאוד רחוק (לוגיקה מיוחדת)
      }
      
      const { data: fareData, error: fareError } = await supabase
        .from('fare_attributes')
        .select('fare_id, price')
        .eq('fare_id', fareId)
        .single();
      
      if (fareError || !fareData) {
        console.error("Error fetching fare attributes:", fareError);
        return null;
      }
      
      console.log(`Zone-distance based fare: ${fareData.price} (${fareData.fare_id})`);
      return {
        price: parseFloat(fareData.price),
        fareId: fareData.fare_id
      };
      
    } catch (error) {
      console.error("Error calculating fare by zones:", error);
    }
    
    return null;
  }

// חישוב תעריף לפי מרחק גיאוגרפי
static async getFareByDistance(
  boardingStopId: string,
  alightingStopId: string
): Promise<{ price: number; fareId: string } | null> {
  
  // Note: supabase is used here for static context, adjust if you need to use a different db client
  const query = `
    SELECT 
      stop_lat::numeric as lat, stop_lon::numeric as lon, stop_id
    FROM stops
    WHERE stop_id = ANY($1)
  `;
  
  try {
    // Fetch both stops in one query
    const { data, error } = await supabase
      .from('stops')
      .select('stop_id, stop_lat, stop_lon')
      .in('stop_id', [boardingStopId, alightingStopId]);
    
    if (error || !data || data.length < 2) return null;

    const stop1 = data.find((s: any) => s.stop_id === boardingStopId);
    const stop2 = data.find((s: any) => s.stop_id === alightingStopId);

    if (!stop1 || !stop2) return null;

    // חישוב מרחק (קירוב פשוט)
    const distance = CalculationService.calculateDistance(
      parseFloat(stop1.stop_lat), parseFloat(stop1.stop_lon),
      parseFloat(stop2.stop_lat), parseFloat(stop2.stop_lon)
    );
    
    // לוגיקה לתעריف לפי מרחק (בק"מ)
    let fareId: string;
    if (distance < 10) {
      fareId = "201"; // 8 שקל - מרחק קצר
    } else if (distance < 25) {
      fareId = "202"; // 14.50 שקל - מרחק בינוני  
    } else if (distance < 50) {
      fareId = "204"; // 19 שקל - מרחק רחוק
    } else {
      fareId = "205"; // 30.50 שקל - מרחק מאוד רחוק
    }
    
    const { data: fareData, error: fareError } = await supabase
      .from('fare_attributes')
      .select('fare_id, price')
      .eq('fare_id', fareId)
      .single();
    
    if (fareError || !fareData) {
      return null;
    }

    return {
      price: parseFloat(fareData.price),
      fareId: fareData.fare_id
    };
    
  } catch (error) {
    console.error("Error calculating fare by distance:", error);
  }
  
  return null;
}

  // חישוב מרחק גיאוגרפי (haversine formula)
  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // רדיוס כדור הארץ בק"מ
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
      
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance;
  }

  static toRadians(degrees: number): number {
    return degrees * (Math.PI/180);
  }
}

// דוגמה לשימוש בסרויס:
/*
// השימוש במתודה המעודכנת
let tripPrice = 8.0;
try {
  const fareResult = await CalculationService.calculateFareImproved(
    tripRequest.route_id,
    tripRequest.boarding_stop_id,
    tripRequest.alighting_stop_id,
    tripRequest.agency_id
  );
  
  tripPrice = fareResult.price;
  
  console.log(`Calculated fare: ${fareResult.price} ILS (${fareResult.fareId}) - Method: ${fareResult.method}`);
  
} catch (fareError) {
  console.warn("Error calculating fare, using default:", fareError);
}
*/