import { supabase } from "../Config/Supabase";
import { FareAttribute, FareCalculationResult, FareRule } from "../Models/Payment";

export class PaymentService {
  static async makePayment() {
    // TODO: implement payment
  }

  static async getUserPayments() {
    // TODO: implement payment list
  }
  //  private static calculateDistance(
  //   coord1: { lat: number; lon: number },
  //   coord2: { lat: number; lon: number }
  // ): number {
  //   const R = 6371; // רדיוס כדור הארץ בקילומטרים
  //   const dLat = this.toRadians(coord2.lat - coord1.lat);
  //   const dLon = this.toRadians(coord2.lon - coord1.lon);
    
  //   const a = 
  //     Math.sin(dLat / 2) * Math.sin(dLat / 2) +
  //     Math.cos(this.toRadians(coord1.lat)) * Math.cos(this.toRadians(coord2.lat)) *
  //     Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  //   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  //   return R * c;
  // }

  // private static toRadians(degrees: number): number {
  //   return degrees * (Math.PI / 180);
  // }
  // /**
  //  * Calculates the price for a trip based on boarding and alighting stops.
  //  * @param boardingStopId The ID of the boarding stop.
  //  * @param alightingStopId The ID of the alighting stop.
  //  * @returns The price of the trip as a number, or null if not found.
  //  */
  // static async calculateTripPrice(
  //   boardingStopId: string,
  //   alightingStopId: string
  // ): Promise<number | null> {
  //   try {
  //     // Step 1: Get zone IDs for the stops
  //     const { data: stopsData, error: stopsError } = await supabase
  //       .from("stops")
  //       .select("stop_id, zone_id")
  //       .in("stop_id", [boardingStopId, alightingStopId]);

  //     if (stopsError) {
  //       throw new Error(`Error fetching stop zones: ${stopsError.message}`);
  //     }
  //     if (!stopsData || stopsData.length < 2) {
  //       console.warn("Could not find zones for both stops.");
  //       return null;
  //     }

  //     const boardingZoneId = stopsData.find(s => s.stop_id === boardingStopId)?.zone_id;
  //     const alightingZoneId = stopsData.find(s => s.stop_id === alightingStopId)?.zone_id;

  //     if (!boardingZoneId || !alightingZoneId) {
  //       console.warn("One or both stops are missing a zone ID.");
  //       return null;
  //     }

  //     console.log(`Boarding Zone: ${boardingZoneId}, Alighting Zone: ${alightingZoneId}`);

  //     // Step 2: Find the fare ID from fare_rules using the zone IDs
  //     const { data: fareRuleData, error: fareRuleError } = await supabase
  //       .from("fare_rules")
  //       .select("fare_id")
  //       .eq("origin_id", boardingZoneId)
  //       .eq("destination_id", alightingZoneId)
  //       .single();
      
  //     if (fareRuleError) {
  //       console.error(`Error finding fare rule: ${fareRuleError.message}`);
  //       return null;
  //     }
  //     if (!fareRuleData) {
  //       console.warn("No fare rule found for the given zones.");
  //       return null;
  //     }

  //     const fareId = fareRuleData.fare_id;
  //     if (!fareId) {
  //         console.warn("Fare ID is null in fare_rules table.");
  //         return null;
  //     }
  //     console.log(`Found Fare ID: ${fareId}`);

  //     // Step 3: Get the price from fare_attributes using the fare ID
  //     const { data: fareAttributeData, error: fareAttributeError } = await supabase
  //       .from("fare_attributes")
  //       .select("price")
  //       .eq("fare_id", fareId)
  //       .single();
      
  //     if (fareAttributeError) {
  //       console.error(`Error fetching fare attributes: ${fareAttributeError.message}`);
  //       return null;
  //     }
  //     if (!fareAttributeData || typeof fareAttributeData.price !== 'number') {
  //       console.warn("Price not found or invalid in fare_attributes.");
  //       return null;
  //     }

  //     console.log(`Found Price: ${fareAttributeData.price}`);
  //     return fareAttributeData.price;

  //   } catch (error) {
  //     console.error("Error calculating trip price:", error);
  //     return null;
  //   }
  // }
   static async calculateFare(
    routeId: string,
    originStopId: string,
    destinationStopId: string,
    agencyId: string
  ): Promise<FareCalculationResult> {
    try {
      console.log(`Calculating fare for route: ${routeId}, origin: ${originStopId}, dest: ${destinationStopId}`);

      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      // נסה למצוא כלל תעריף ספציפי
      const fareRule = await this.findApplicableFareRule(routeId, originStopId, destinationStopId);
      
      if (!fareRule) {
        // אם לא נמצא כלל ספציפי, השתמש בתעריף ברירת מחדל לסוכנות
        return await this.getDefaultFare(agencyId);
      }

      // קבל את פרטי התעריף
      const { data: fareAttributes, error: fareError } = await supabase
        .from("fare_attributes")
        .select("*")
        .eq("fare_id", fareRule.fare_id)
        .single();

      if (fareError || !fareAttributes) {
        console.warn(`No fare attributes found for fare_id: ${fareRule.fare_id}`);
        return await this.getDefaultFare(agencyId);
      }

      return {
        fare_id: fareRule.fare_id,
        price: parseFloat(fareAttributes.price) || 0,
        currency: fareAttributes.currency_type || 'ILS',
        rule_type: this.getRuleType(fareRule),
        description: this.generateFareDescription(fareRule, fareAttributes)
      };

    } catch (error) {
      console.error('Error in calculateFare:', error);
      throw error;
    }
  }

  /**
   * מחפש כלל תעריף מתאים לפי סדר עדיפות
   */
  private static async findApplicableFareRule(
    routeId: string,
    originStopId: string,
    destinationStopId: string
  ): Promise<FareRule | null> {
    
    // עדיפות 1: כלל ספציפי לנתיב ותחנות מקור-יעד
    let { data: specificRule } = await supabase
      .from("fare_rules")
      .select("*")
      .eq("route_id", routeId)
      .eq("origin_id", originStopId)
      .eq("destination_id", destinationStopId)
      .limit(1);

    if (specificRule && specificRule.length > 0) {
      console.log('Found specific origin-destination rule');
      return specificRule[0];
    }

    // עדיפות 2: כלל לפי נתיב בלבד
    let { data: routeRule } = await supabase
      .from("fare_rules")
      .select("*")
      .eq("route_id", routeId)
      .is("origin_id", null)
      .is("destination_id", null)
      .limit(1);

    if (routeRule && routeRule.length > 0) {
      console.log('Found route-specific rule');
      return routeRule[0];
    }

    // עדיפות 3: כלל לפי אזור (contains_id)
    const originZone = await this.getStopZone(originStopId);
    const destZone = await this.getStopZone(destinationStopId);

    if (originZone) {
      let { data: zoneRule } = await supabase
        .from("fare_rules")
        .select("*")
        .eq("contains_id", originZone)
        .limit(1);

      if (zoneRule && zoneRule.length > 0) {
        console.log('Found zone-based rule');
        return zoneRule[0];
      }
    }

    console.log('No specific fare rule found');
    return null;
  }

  /**
   * קבלת תעריף ברירת מחדל לסוכנות
   */
  private static async getDefaultFare(agencyId: string): Promise<FareCalculationResult> {
    const { data: defaultFare, error } = await supabase
      .from("fare_attributes")
      .select("*")
      .eq("agency_id", agencyId)
      .order("fare_id")
      .limit(1);

    if (error || !defaultFare || defaultFare.length === 0) {
      // אם אין תעריף ברירת מחדל, השתמש בתעריף קבוע
      return {
        fare_id: 'default',
        price: 5.90,
        currency: 'ILS',
        rule_type: 'default',
        description: 'תעריف ברירת מחדל'
      };
    }

    const fare = defaultFare[0];
    return {
      fare_id: fare.fare_id,
      price: parseFloat(fare.price) || 5.90,
      currency: fare.currency_type || 'ILS',
      rule_type: 'default',
      description: 'תעריף בסיסי לסוכנות'
    };
  }

  /**
   * קבלת אזור התחנה (לכללי תעריף מבוססי אזור)
   */
  private static async getStopZone(stopId: string): Promise<string | null> {
    // זה תלוי במבנה הנתונים שלך - יכול להיות שדה zone_id בטבלת stops
    // או טבלה נפרדת לאזורים
    const { data: stop } = await supabase
      .from("stops")
      .select("zone_id")
      .eq("stop_id", stopId)
      .single();

    return stop?.zone_id || null;
  }

  /**
   * זיהוי סוג הכלל
   */
  private static getRuleType(rule: FareRule): 'route' | 'zone' | 'origin_destination' | 'default' {
    if (rule.origin_id && rule.destination_id) return 'origin_destination';
    if (rule.contains_id) return 'zone';
    if (rule.route_id) return 'route';
    return 'default';
  }

  /**
   * יצירת תיאור התעריף
   */
  private static generateFareDescription(rule: FareRule, attributes: FareAttribute): string {
    const ruleType = this.getRuleType(rule);
    
    switch (ruleType) {
      case 'origin_destination':
        return `תעריף ספציפי מתחנה ${rule.origin_id} לתחנה ${rule.destination_id}`;
      case 'route':
        return `תעריף לנתיב ${rule.route_id}`;
      case 'zone':
        return `תעריף לפי אזור ${rule.contains_id}`;
      default:
        return 'תעריף בסיסי';
    }
  }

  /**
   * עדכון מחיר הנסיעה בטבלת rides
   */
  static async updateRideFare(rideId: string): Promise<void> {
    try {
      // קבל את פרטי הנסיעה
      const { data: ride, error: rideError } = await supabase
        .from("rides")
        .select(`
          *,
          trips!inner(route_id)
        `)
        .eq("id", rideId)
        .single();

      if (rideError || !ride) {
        throw new Error(`Ride not found: ${rideId}`);
      }

      // חשב את המחיר
      const fareResult = await this.calculateFare(
        ride.trips.route_id,
        ride.start_stop_id,
        ride.end_stop_id,
        ride.agency_id
      );

      // עדכן את המחיר בנסיעה
      const { error: updateError } = await supabase
        .from("rides")
        .update({ 
          amount: fareResult.price,
          // אפשר להוסיף שדות נוספים כמו fare_id, currency
        })
        .eq("id", rideId);

      if (updateError) {
        throw new Error(`Error updating ride fare: ${updateError.message}`);
      }

      console.log(`Updated ride ${rideId} with fare: ${fareResult.price} ${fareResult.currency}`);

    } catch (error) {
      console.error('Error in updateRideFare:', error);
      throw error;
    }
  }

  /**
   * קבלת כל התעריפים הזמינים לסוכנות
   */
  static async getAvailableFares(agencyId: string): Promise<FareAttribute[]> {
    const { data: fares, error } = await supabase
      .from("fare_attributes")
      .select("*")
      .eq("agency_id", agencyId)
      .order("price");

    if (error) {
      throw new Error(`Error fetching fares: ${error.message}`);
    }

    return fares || [];
  }
}
