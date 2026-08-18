import { supabase } from "../Config/Supabase";
export class UserService {
  static async getUserProfile() {
    // TODO: implement profile fetch
  }

  static async updateUserProfile() {
    // TODO: implement profile update
  }

static async getUserByPhone(phone: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id, name")
    .eq("phone_number", phone)
    .single();

  if (error) {
    console.error("Error fetching user by phone:", error);
    return null;
  }
  return data;
}

static async getUserActiveRide(userId: string) {
 try {
    console.log(`Getting active ride for userPhone: ${userId}`);

    if (!supabase) {
      throw new Error("Supabase client not initialized");
    }

    const { data: rides, error } = await supabase
      .from("rides")
      .select("*")
      .eq("user_id", userId)
      .gte("expires_at", new Date().toISOString())
      .order("start_time", { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(`Error fetching active ride: ${error.message}`);
    }

    if (!rides || rides.length === 0) {
      return null;
    }

    return rides[0];
  } catch (error) {
    console.error("Error in getUserActiveRide:", error);
    throw error;
  }
}
static async getUserActiveRideByPhone(phone: string): Promise<any> {
  try {
    const userData = await UserService.getUserByPhone(phone);
    
    if (!userData) {
      return null;
    }

    return await this.getUserActiveRide(userData.id);
  } catch (error) {
    console.error("Error in getUserActiveRideByPhone:", error);
    throw error;
  }
}
}
