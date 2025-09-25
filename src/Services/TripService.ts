import { supabase } from "../Config/Supabase";
import { Trip, StopForTrip, TripRequest } from "../Models/Trip";
import { generateConfirmationCode } from "../Utils/Confirm";
import { PaymentService } from "./PaymentService";
export class TripService {
  static async createTrip(tripRequest: TripRequest): Promise<any> {
    try {
      console.log("=== USING RIDES TABLE ===");
      console.log("Creating new ride:", tripRequest);
      console.log("Route ID from request:", tripRequest.route_id);

      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      // וולידציות בסיסיות
      if (!tripRequest.user_id || !tripRequest.route_id) {
        throw new Error("Missing required fields: user_id, route_id");
      }

      if (tripRequest.boarding_stop_id === tripRequest.alighting_stop_id) {
        throw new Error("Boarding and alighting stops cannot be same");
      }

      let tripPrice = 8.0; // ברירת מחדל
      try {
        const fareResult = await PaymentService.calculateFare(
          tripRequest.route_id,
          tripRequest.boarding_stop_id,
          tripRequest.alighting_stop_id,
          tripRequest.agency_id
        );
        tripPrice = fareResult.price;
        console.log("Calculated fare successfully:", fareResult);
      } catch (fareError) {
        console.warn("Error calculating fare, using default:", fareError);
      }

      // מצא trip_id אמיתי מהדאטהבייס
      const { data: existingTrip, error: tripError } = await supabase
        .from("trips")
        .select("trip_id")
        .eq("route_id", tripRequest.route_id) // השתמש ב-route_id שהתקבל
        .eq("direction_id", tripRequest.direction_id)
        .limit(1);

      if (tripError) {
        throw new Error(`Error finding trip: ${tripError.message}`);
      }

      if (!existingTrip || existingTrip.length === 0) {
        throw new Error(
          `No trip found for route ${tripRequest.route_id}, direction ${tripRequest.direction_id}`
        );
      }

      const actualTripId = existingTrip[0].trip_id;
      console.log("Found trip_id:", actualTripId);

      // יצירת הנסיעה עם המחיר המחושב
      const rideData = {
        user_id: tripRequest.user_id,
        trip_id: actualTripId,
        direction_id: tripRequest.direction_id,
        start_stop_id: tripRequest.boarding_stop_id,
        end_stop_id: tripRequest.alighting_stop_id,
        boarding_coordinates: tripRequest.boarding_coordinates,
        alighting_coordinates: tripRequest.alighting_coordinates,
        agency_id: tripRequest.agency_id,
        line_number: tripRequest.line_number,
        bus_code: tripRequest.line_number,
        start_time: new Date(),
        amount: tripPrice, // אם לא מצליח לחשב, השתמש במחיר ברירת מחדל של 8₪
        expires_at: new Date(Date.now() + 90 * 60 * 1000), // 90 דקות מהזמן הנוכחי
        confirmation_code: `CONF_${generateConfirmationCode()}`
      };
      console.log("Ride data to insert:", rideData.start_time);
      console.log("Ride data to insert:", rideData.expires_at);
      
      
      console.log("Inserting ride data with amount:", rideData.amount);

      const { data: createdRide, error: createError } = await supabase
        .from("rides")
        .insert(rideData)
        .select()
        .single();

      if (createError) {
        console.error("Supabase insert error:", createError);
        throw new Error(`Error creating ride: ${createError.message}`);
      }

      console.log("Ride created successfully with price:", createdRide.amount);
      return createdRide;
    } catch (error) {
      console.error("Error in createTrip:", error);
      throw error;
    }
  }

  static async updateTripStatus(
    tripId: string,
    status: string,
    paymentConfirmationCode?: string
  ): Promise<any> {
    try {
      console.log(`Updating ride ${tripId} status to ${status}`);

      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      const updateData: any = {};

      // עדכון לפי הסטטוס
      if (status === "confirmed") {
        updateData.start_time = new Date();
        if (paymentConfirmationCode) {
          updateData.confirmation_code = paymentConfirmationCode;
        }
      } else if (status === "completed") {
        updateData.end_time = new Date();
      }

      const { data: updatedRide, error } = await supabase
        .from("rides")
        .update(updateData)
        .eq("id", tripId)
        .select()
        .single();

      if (error) {
        throw new Error(`Error updating ride: ${error.message}`);
      }

      console.log("Ride updated successfully");
      return { ...updatedRide, status: status }; // מחזיר עם הסטטוס
    } catch (error) {
      console.error("Error in updateTripStatus:", error);
      throw error;
    }
  }

  static async getUserTrips(
    userId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<any[]> {
    try {
      console.log(`Getting rides for user: ${userId}`);

      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      const { data: rides, error } = await supabase
        .from("rides")
        .select("*")
        .eq("user_id", userId)
        .order("start_time", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Error fetching user rides: ${error.message}`);
      }

      console.log(`Found ${rides?.length || 0} rides for user ${userId}`);
      return rides || [];
    } catch (error) {
      console.error("Error in getUserTrips:", error);
      throw error;
    }
  }

  static async searchTrips(filters: {
    userId?: string;
    lineNumber?: string;
    agencyId?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<any[]> {
    try {
      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      let query = supabase.from("rides").select("*");

      if (filters.userId) query = query.eq("user_id", filters.userId);
      if (filters.lineNumber)
        query = query.eq("line_number", filters.lineNumber);
      if (filters.agencyId) query = query.eq("agency_id", filters.agencyId);
      if (filters.fromDate)
        query = query.gte("start_time", filters.fromDate.toISOString());
      if (filters.toDate)
        query = query.lte("start_time", filters.toDate.toISOString());

      const { data: rides, error } = await query.order("start_time", {
        ascending: false
      });

      if (error) {
        throw new Error(`Error searching rides: ${error.message}`);
      }

      return rides || [];
    } catch (error) {
      console.error("Error in searchTrips:", error);
      throw error;
    }
  }
}

