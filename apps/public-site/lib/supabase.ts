import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type PublicStats = {
  id: string;
  updated_at: string;
  broker_name: string;
  is_live: boolean;
  starting_amount: number;
  current_amount: number;
  total_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  realized_pnl: number;
  pnl_pct: number;
};
