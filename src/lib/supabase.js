import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://iiykfcjlxvqlyzyjltro.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable__4nNKgHskkqmWYh2W5_r1g_vSlA2iem";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
