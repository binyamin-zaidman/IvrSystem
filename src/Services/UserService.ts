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

}
