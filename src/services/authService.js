import { supabase } from "./supabase.js";

export async function login(email, password) {
  if (!email || !password) {
    return { error: "Vul email en wachtwoord in" };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return { error: "Ongeldige inloggegevens" };
  }

  return { user: data.user };
}

