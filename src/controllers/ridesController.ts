import { Request, Response } from "express";
import { supabase } from "../Config/Supabase";
import { generateConfirmationCode } from "../Utils/Confirm";
import * as busService from "../Services/busService";


export async function getLineBusInfo(req: Request, res: Response) {
  const lineBusInfo = req.body.lineBusInfo as string;
  if (!lineBusInfo) return res.status(400).json({ message: "lineBusInfo is required" });

  try {
    const busInfo = await busService.getBusInfoWithDirections(lineBusInfo);
    return res.json(busInfo);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
}

export async function startRide(req: Request, res: Response) {
  console.log("-----Start ride request body-----");
  const { phoneNumber, tripId, startStopId, endStopId } = req.body as {
    phoneNumber?: string;
    tripId?: string;
    startStopId?: string;
    endStopId?: string;
  };

  if (!phoneNumber || !tripId || !startStopId || !endStopId) {
    return res
      .status(400)
      .json({
        message: "phoneNumber, tripId, startStopId and endStopId are required"
      });
  }

  // בדיקת משתמש
  const { data: users, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("phone_number", phoneNumber)
    .limit(1);

  if (userError) return res.status(500).json({ message: userError.message });
  if (!users || users.length === 0)
    return res.status(404).json({ message: "User not found" });

  const userId = users[0].id;

  // קוד אישור
  const confirmationCode = generateConfirmationCode();

  // שליפת trip info לטובת bus_code
  const { data: trips, error: tripError } = await supabase
    .from("trips")
    .select("trip_id, route_id")
    .eq("trip_id", tripId)
    .limit(1);

  if (tripError) return res.status(500).json({ message: tripError.message });
  if (!trips || trips.length === 0)
    return res.status(404).json({ message: "Trip not found" });

  const busCode = trips[0].route_id; // כאן אנו מניחים שה־route_id הוא ה־bus_code
  console.log({
    userIdFromDb: userId,
    typeOfUserId: typeof userId,
    busCode: busCode,
  });
  // יצירת נסיעה
  const { data: ride, error: rideError } = await supabase
    .from("rides")
    .insert({
      user_id: users[0].id,
      trip_id: tripId,
      start_stop_id: startStopId,
      end_stop_id: endStopId,
      bus_code: busCode,
      confirmation_code: confirmationCode,
      start_time: new Date(),
      end_time: null,
      amount: null
    })
    .select("id, confirmation_code, start_time")
    .single();

  if (rideError) return res.status(500).json({ message: rideError.message });

  return res.json({
    confirmationCode: ride.confirmation_code,
    startTime: ride.start_time
  });
}

export async function getLastConfirmation(req: Request, res: Response) {
  const phone = String(req.params.phone ?? "");
  if (!phone) return res.status(400).json({ message: "phone required" });

  const { data: users, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("phone_number", phone)
    .limit(1);

  if (userError) return res.status(500).json({ message: userError.message });
  if (!users || users.length === 0)
    return res.status(404).json({ message: "User not found" });

  const userId = users[0].id;

  const { data: rides, error: rideError } = await supabase
    .from("rides")
    .select("confirmation_code")
    .eq("user_id", userId)
    .order("start_time", { ascending: false })
    .limit(1);

  if (rideError) return res.status(500).json({ message: rideError.message });
  if (!rides || rides.length === 0)
    return res.status(404).json({ message: "No rides found" });

  return res.json({ confirmationCode: rides[0].confirmation_code });
}

export async function validateCode(req: Request, res: Response) {
  const { tripId, confirmationCode, busCode } = req.body as {
    tripId?: string;
    confirmationCode?: string;
    busCode?: string;
  };
  if (!tripId || !confirmationCode)
    return res
      .status(400)
      .json({ message: "tripId and confirmationCode required" });

  let query = supabase
    .from("rides")
    .select("id, validated_at")
    .eq("trip_id", tripId)
    .eq("confirmation_code", confirmationCode)
    .order("start_time", { ascending: false })
    .limit(1);

  if (busCode) query = query.or(`bus_code.is.null,bus_code.eq.${busCode}`);

  const { data, error } = await query;
  if (error) return res.status(500).json({ message: error.message });
  if (!data || data.length === 0)
    return res.status(404).json({ message: "Invalid or expired code" });

  const ride = data[0];
  if (ride.validated_at)
    return res.status(409).json({ message: "Code already validated" });

  const { error: updateError } = await supabase
    .from("rides")
    .update({ validated_at: new Date() })
    .eq("id", ride.id);
  if (updateError)
    return res.status(500).json({ message: updateError.message });

  return res.json({ valid: true, rideId: ride.id });
}

export async function listUserRides(req: Request, res: Response) {
  const phone = String(req.params.phone ?? "");
  if (!phone) return res.status(400).json({ message: "phone required" });

  const { data: users, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("phone_number", phone)
    .limit(1);

  if (userError) return res.status(500).json({ message: userError.message });
  if (!users || users.length === 0)
    return res.status(404).json({ message: "User not found" });

  const userId = users[0].id;

  const { data: rides, error: ridesError } = await supabase
    .from("rides")
    .select(
      "id, trip_id, start_stop_id, end_stop_id, start_time, end_time, confirmation_code, validated_at, bus_code"
    )
    .eq("user_id", userId)
    .order("start_time", { ascending: false });

  if (ridesError) return res.status(500).json({ message: ridesError.message });

  return res.json({ rides });
}
