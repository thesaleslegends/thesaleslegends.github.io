import { supabase } from "../services/supabase.js";

export async function requireAuth() {
  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    window.location.href = "/src/pages/auth/login.html";
  }
}