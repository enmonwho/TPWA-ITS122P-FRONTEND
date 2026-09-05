export interface Trip {
  id: string;
  name: string;
  countries: string[];
  startDate: string;
  endDate: string;
  travelType: string;
  status: 'upcoming' | 'completed';
  nights: number;
}
