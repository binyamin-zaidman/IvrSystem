import { supabase } from "../Config/Supabase";
import { GTFSService } from "./GTFSService";
import {FareRule,FareAttribute,FareCalculationResult} from "../Models/Payment"


export class PaymentService {
  // static async calculateTripPrice(
  //   boardingStopId: string,
  //   alightingStopId: string,
  //   routeId: string
  // ): Promise<number | null> {
  //   try {
  //     // שלב 1: קבלת Zone IDs
  //     const { data: stopsData, error: stopsError } = await supabase
  //       .from("stops")
  //       .select("stop_id, zone_id")
  //       .in("stop_id", [boardingStopId, alightingStopId]);

  //     if (stopsError || !stopsData || stopsData.length < 2) {
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

  //     // שלב 2: חיפוש כללי תעריף ספציפיים (כולל Route ID)
  //     const { data: specificFareRules, error: specificFareError } = await supabase
  //       .from("fare_rules")
  //       .select("fare_id")
  //       .eq("route_id", routeId)
  //       .or(
  //         `origin_id.eq.${boardingZoneId},destination_id.eq.${alightingZoneId},origin_id.eq.${alightingZoneId},destination_id.eq.${boardingZoneId}`
  //       );

  //     if (specificFareError) {
  //       console.error(`Error finding specific fare rules: ${specificFareError.message}`);
  //       return null;
  //     }

  //     if (specificFareRules && specificFareRules.length > 0) {
  //       const fareIds = [...new Set(specificFareRules.map(rule => rule.fare_id))];
  //       console.log(`Found specific Fare IDs for route ${routeId}: ${fareIds.join(', ')}`);
  //       return await this.getCheapestPrice(fareIds);
  //     }

  //     // שלב 3: חזרה לכלל תעריף כללי אם לא נמצא כלל ספציפי
  //     console.warn("No specific fare rules found. Checking for a general rule.");
  //     const { data: generalFareRules, error: generalFareError } = await supabase
  //       .from("fare_rules")
  //       .select("fare_id")
  //       .or(
  //         `origin_id.eq.${boardingZoneId},destination_id.eq.${alightingZoneId},origin_id.eq.${alightingZoneId},destination_id.eq.${boardingZoneId}`
  //       );

  //     if (generalFareError || !generalFareRules || generalFareRules.length === 0) {
  //       console.warn("No general fare rule found. Cannot calculate price.");
  //       return null;
  //     }

  //     const generalFareIds = [...new Set(generalFareRules.map(rule => rule.fare_id))];
  //     console.log(`Found general Fare IDs: ${generalFareIds.join(', ')}`);
  //     return await this.getCheapestPrice(generalFareIds);

  //   } catch (error) {
  //     console.error("Error calculating trip price:", error);
  //     return null;
  //   }
  // }

  // // פונקציית עזר לשליפת המחיר הזול ביותר
  // private static async getCheapestPrice(fareIds: string[]): Promise<number | null> {
  //   const { data: fareAttributesData, error: fareAttributeError } = await supabase
  //     .from("fare_attributes")
  //     .select("price")
  //     .in("fare_id", fareIds)
  //     .order("price", { ascending: true })
  //     .limit(1);

  //   if (fareAttributeError || !fareAttributesData || fareAttributesData.length === 0) {
  //     console.error(`Error fetching fare attributes or no prices found: ${fareAttributeError?.message}`);
  //     return null;
  //   }

  //   const price = fareAttributesData[0].price;
  //   return typeof price === 'number' ? price : null;
  // }

  static async calculateFare(
    routeId: string,
    originStopId: string,
    destinationStopId: string,
    agencyId: string
  ): Promise<FareCalculationResult> {
    try {
      console.log(
        `Calculating fare for route: ${routeId}, origin: ${originStopId}, dest: ${destinationStopId}`
      );

      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      // נסה למצוא כלל תעריף ספציפי
      const fareRule = await this.findApplicableFareRule(
        routeId,
        originStopId,
        destinationStopId
      );

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
        console.warn(
          `No fare attributes found for fare_id: ${fareRule.fare_id}`
        );
        return await this.getDefaultFare(agencyId);
      }

      return {
        fare_id: fareRule.fare_id,
        price: parseFloat(fareAttributes.price) || 0,
        currency: fareAttributes.currency_type || "ILS",
        rule_type: this.getRuleType(fareRule),
        description: this.generateFareDescription(fareRule, fareAttributes)
      };
    } catch (error) {
      console.error("Error in calculateFare:", error);
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
      console.log("Found specific origin-destination rule");
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
      console.log("Found route-specific rule");
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
        console.log("Found zone-based rule");
        return zoneRule[0];
      }
    }

    console.log("No specific fare rule found");
    return null;
  }

  /**
   * קבלת תעריף ברירת מחדל לסוכנות
   */
  private static async getDefaultFare(
    agencyId: string
  ): Promise<FareCalculationResult> {
    const { data: defaultFare, error } = await supabase
      .from("fare_attributes")
      .select("*")
      .eq("agency_id", agencyId)
      .order("fare_id")
      .limit(1);

    if (error || !defaultFare || defaultFare.length === 0) {
      // אם אין תעריף ברירת מחדל, השתמש בתעריף קבוע
      return {
        fare_id: "default",
        price: 5.9,
        currency: "ILS",
        rule_type: "default",
        description: "תעריף ברירת מחדל"
      };
    }

    const fare = defaultFare[0];
    return {
      fare_id: fare.fare_id,
      price: parseFloat(fare.price) || 5.9,
      currency: fare.currency_type || "ILS",
      rule_type: "default",
      description: "תעריף בסיסי לסוכנות"
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
  private static getRuleType(
    rule: FareRule
  ): "route" | "zone" | "origin_destination" | "default" {
    if (rule.origin_id && rule.destination_id) return "origin_destination";
    if (rule.contains_id) return "zone";
    if (rule.route_id) return "route";
    return "default";
  }

  /**
   * יצירת תיאור התעריף
   */
  private static generateFareDescription(
    rule: FareRule,
    attributes: FareAttribute
  ): string {
    const ruleType = this.getRuleType(rule);

    switch (ruleType) {
      case "origin_destination":
        return `תעריף ספציפי מתחנה ${rule.origin_id} לתחנה ${rule.destination_id}`;
      case "route":
        return `תעריף לנתיב ${rule.route_id}`;
      case "zone":
        return `תעריף לפי אזור ${rule.contains_id}`;
      default:
        return "תעריף בסיסי";
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
        .select(
          `
          *,
          trips!inner(route_id)
        `
        )
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
          amount: fareResult.price
          // אפשר להוסיף שדות נוספים כמו fare_id, currency
        })
        .eq("id", rideId);

      if (updateError) {
        throw new Error(`Error updating ride fare: ${updateError.message}`);
      }

      console.log(
        `Updated ride ${rideId} with fare: ${fareResult.price} ${fareResult.currency}`
      );
    } catch (error) {
      console.error("Error in updateRideFare:", error);
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

  static async verifyRide(
    confirmationCode: string,
    lineNumber: string,
    inspectorStopId: string
  ) {
    try {
      console.log(
        `Verifying ride for confirmationCode: ${confirmationCode}, line: ${lineNumber}, inspectorStopId: ${inspectorStopId}`
      );

      // שלב 1: מציאת נסיעה תואמת ב-rides עם JOIN ל-routes כדי לקבל route_id
      const { data: rideData } = await supabase
        .from("rides")
        .select("*")
        .eq("confirmation_code", confirmationCode)
        .eq("bus_code", lineNumber)
        .limit(1);
      console.log("Ride data without join:", rideData);

      console.log(`Ride data :`, rideData);

      if (!rideData || rideData.length === 0) {
        console.log("No matching ride found");
        return null;
      }

      const ride = rideData[0];
      console.log("שלב 1 הצליח: נמצאה נסיעה תואמת:", ride);

      const routeId = rideData[0].route_id;
      if (!routeId) {
        throw new Error("No route_id found for this ride");
      }

      // שלב 2: קבלת התחנות לנסיעה
      const stops = await GTFSService.getStopsForRoute(
        routeId,
        ride.direction_id,
        ride.agency_id
      );

      console.log(`Found ${stops.length} stops for this ride`);

      // שלב 3: בדיקה אם inspectorStopId נמצא בין התחנות
      const inspectorStop = stops.find((s) => s.stop_id === inspectorStopId);
      if (!inspectorStop) {
        throw new Error(
          `Inspector stop ${inspectorStopId} not found on this route`
        );
      }

      // אם הכל בסדר, מחזירים את הנסיעה והתחנות
      return {
        ride,
        stops
      };
    } catch (error) {
      console.error("שגיאה במהלך אימות הנסיעה:", error);
      throw error;
    }
  }
}
