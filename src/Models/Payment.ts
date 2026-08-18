export interface Payment {
  id: string;
  user_id: string;
  amount: number;
  created_at: string;
}
export interface FareRule {
  fare_id: string;
  route_id: string;
  origin_id: string;
  destination_id: string;
  contains_id: string;
}

export interface FareAttribute {
  fare_id: string;
  price: number;
  currency_type: string;
  payment_method: number;
  transfers: number;
  transfer_duration: number;
  agency_id: string;
}

export interface FareCalculationResult {
  fare_id: string;
  price: number;
  currency: string;
  rule_type: 'route' | 'zone' | 'origin_destination' | 'default';
  description: string;
}
