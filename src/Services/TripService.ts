import { supabase } from "../Config/Supabase";
import { Trip, StopForTrip, TripRequest } from "../Models/Trip";
export class TripService {
 
  static async createTrip(tripRequest: TripRequest): Promise<Trip> {
    try {
      console.log('Creating new trip:', tripRequest);

      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      // וולידציות בסיסיות
      if (!tripRequest.user_id || !tripRequest.route_id) {
        throw new Error("Missing required fields: user_id, route_id");
      }

      if (tripRequest.boarding_stop_id === tripRequest.alighting_stop_id) {
        throw new Error("Boarding and alighting stops cannot be the same");
      }

      // קבלת שמות התחנות מהדאטהבייס
      const { data: boardingStopData, error: boardingError } = await supabase
        .from("stops")
        .select("stop_name")
        .eq("stop_id", tripRequest.boarding_stop_id)
        .single();

      const { data: alightingStopData, error: alightingError } = await supabase
        .from("stops")
        .select("stop_name")
        .eq("stop_id", tripRequest.alighting_stop_id)
        .single();

      if (boardingError || alightingError) {
        throw new Error("Error fetching stop information");
      }

      // יצירת הנסיעה
      const tripData = {
        user_id: tripRequest.user_id,
        line_number: tripRequest.line_number,
        agency_id: tripRequest.agency_id,
        route_id: tripRequest.route_id,
        direction_id: tripRequest.direction_id,
        boarding_stop_name: boardingStopData.stop_name,
        alighting_stop_name: alightingStopData.stop_name,
        boarding_stop_id: tripRequest.boarding_stop_id,
        alighting_stop_id: tripRequest.alighting_stop_id,
        boarding_coordinates: tripRequest.boarding_coordinates,
        alighting_coordinates: tripRequest.alighting_coordinates,
        trip_date: tripRequest.trip_date || new Date(),
        status: 'pending' as const,
        created_at: new Date()
      };

      const { data: createdTrip, error: createError } = await supabase
        .from("trips")
        .insert(tripData)
        .select()
        .single();

      if (createError) {
        throw new Error(`Error creating trip: ${createError.message}`);
      }

      console.log('Trip created successfully:', createdTrip.id);
      return createdTrip;

    } catch (error) {
      console.error('Error in createTrip:', error);
      throw error;
    }
  }
 static async updateTripStatus(
    tripId: string,
    status: Trip['status'],
    paymentConfirmationCode?: string
  ): Promise<Trip> {
    try {
      console.log(`Updating trip ${tripId} status to ${status}`);

      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      const updateData: any = { status };
      if (paymentConfirmationCode) {
        updateData.payment_confirmation_code = paymentConfirmationCode;
      }

      const { data: updatedTrip, error } = await supabase
        .from("trips")
        .update(updateData)
        .eq("id", tripId)
        .select()
        .single();

      if (error) {
        throw new Error(`Error updating trip: ${error.message}`);
      }

      console.log('Trip updated successfully');
      return updatedTrip;

    } catch (error) {
      console.error('Error in updateTripStatus:', error);
      throw error;
    }
  }
  static async getUserTrips(
    userId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<Trip[]> {
    try {
      console.log(`Getting trips for user: ${userId}`);

      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      const { data: trips, error } = await supabase
        .from("trips")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Error fetching user trips: ${error.message}`);
      }

      console.log(`Found ${trips?.length || 0} trips for user ${userId}`);
      return trips || [];

    } catch (error) {
      console.error('Error in getUserTrips:', error);
      throw error;
    }
  }
static async searchTrips(filters: {
    userId?: string;
    lineNumber?: string;
    agencyId?: string;
    status?: Trip['status'];
    fromDate?: Date;
    toDate?: Date;
  }): Promise<Trip[]> {
    try {
      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      let query = supabase.from("trips").select("*");

      // הוספת פילטרים לפי הצורך
      if (filters.userId) query = query.eq("user_id", filters.userId);
      if (filters.lineNumber) query = query.eq("line_number", filters.lineNumber);
      if (filters.agencyId) query = query.eq("agency_id", filters.agencyId);
      if (filters.status) query = query.eq("status", filters.status);
      if (filters.fromDate) query = query.gte("trip_date", filters.fromDate.toISOString());
      if (filters.toDate) query = query.lte("trip_date", filters.toDate.toISOString());

      const { data: trips, error } = await query.order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Error searching trips: ${error.message}`);
      }

      return trips || [];

    } catch (error) {
      console.error('Error in searchTrips:', error);
      throw error;
    }
  }
}
