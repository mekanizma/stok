import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase yapılandırması eksik. .env dosyasına VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY ekleyin.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---- Types ----

export type AssetStatus = 'ready' | 'deployed';
export type CategoryType = 'asset' | 'license' | 'accessory' | 'consumable';
export type CheckoutAction = 'checkout' | 'checkin' | 'audit';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color: string;
  created_at: string;
}

export interface Manufacturer {
  id: string;
  name: string;
  url: string | null;
  support_url: string | null;
  created_at: string;
}

export interface Location {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
}

export interface UserRecord {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  employee_num: string | null;
  location_id: string | null;
  app_role: 'admin' | 'hr' | 'it' | null;
  created_at: string;
  location?: Location | null;
}

export interface Asset {
  id: string;
  asset_tag: string;
  name: string;
  serial: string | null;
  model: string | null;
  manufacturer_id: string | null;
  category_id: string | null;
  default_location_id: string | null;
  assigned_to_id: string | null;
  assignee_name: string | null;
  assignee_email: string | null;
  status: AssetStatus;
  purchase_date: string | null;
  purchase_cost: number | null;
  order_number: string | null;
  supplier: string | null;
  warranty_months: number | null;
  notes: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  manufacturer?: Manufacturer | null;
  category?: Category | null;
  default_location?: Location | null;
  assigned_to?: UserRecord | null;
}

export interface Accessory {
  id: string;
  name: string;
  serial: string | null;
  manufacturer_id: string | null;
  category_id: string | null;
  location_id: string | null;
  qty: number;
  remaining_qty: number;
  min_qty: number;
  created_at: string;
  manufacturer?: Manufacturer | null;
  category?: Category | null;
  location?: Location | null;
}

export interface Consumable {
  id: string;
  name: string;
  manufacturer_id: string | null;
  category_id: string | null;
  qty: number;
  remaining_qty: number;
  min_qty: number;
  created_at: string;
  manufacturer?: Manufacturer | null;
  category?: Category | null;
}

export interface License {
  id: string;
  name: string;
  serial: string | null;
  manufacturer_id: string | null;
  category_id: string | null;
  seats: number;
  remaining_seats: number;
  expiration_date: string | null;
  purchase_cost: number | null;
  created_at: string;
  manufacturer?: Manufacturer | null;
  category?: Category | null;
}

export interface CheckoutHistory {
  id: string;
  asset_id: string | null;
  accessory_id: string | null;
  consumable_id: string | null;
  license_id: string | null;
  assigned_to_id: string | null;
  action: CheckoutAction;
  note: string | null;
  qty: number | null;
  given_to: string | null;
  performed_by_name: string | null;
  performed_by_email: string | null;
  created_at: string;
  asset?: Asset | null;
  accessory?: Accessory | null;
  consumable?: Consumable | null;
  assigned_to?: UserRecord | null;
}
