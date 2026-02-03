import { supabase } from "../services/supabase.js";

export default async function requireAuth() {
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    // Niet ingelogd → terug naar login
    window.location.href = "/src/pages/auth/login.html";
  }
}