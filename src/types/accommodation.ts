export interface Accommodation {
  id: number | string;
  country: string;
  area: string;
  name: string;
  address?: string | null;
  price: number | string;
  active?: boolean;
  is_active?: boolean;
}
