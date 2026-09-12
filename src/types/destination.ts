export interface Destination {
  id: number;
  trip_id: number | null;
  locationname: string;
  latitude: number;
  longitude: number;
  order_sequence: number;
}

export interface Category {
  id: number;
  name: string;
  type: string;
}
