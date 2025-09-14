import { StopTime } from "./StopTime";

export interface Trip {
  id: string;
  user_id: string;
  route_id: string;
  start_stop_id: string;
  end_stop_id: string;
  created_at: string;
  stop_times: StopTime[];
}
