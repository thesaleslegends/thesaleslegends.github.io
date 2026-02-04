import { supabase } from "./supabase.js";

export async function getAdminStats() {
  const { data, error } = await supabase
    .from("orders")
    .select("*");

  if (error) {
    console.error(error);
    return [];
  }

  return data;
}