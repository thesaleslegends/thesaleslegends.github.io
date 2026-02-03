import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://JOUW_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "JOUW_PUBLIC_ANON_KEY";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);