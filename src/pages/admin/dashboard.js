import requireAuth from "../../utils/guards.js";
import { supabase } from "../../services/supabase.js";

console.log("🔥 ADMIN dashboard.js actief");

document.addEventListener("DOMContentLoaded", async () => {
  // 🔐 Beveiliging
  await requireAuth();

  console.log("✅ Backend dashboard geladen");

  // hier komt later je dashboard-logica
});

  // 📅 Dag invoer
  document.getElementById("daginvoer")?.addEventListener("click", () => {
    window.location.href = "../daginvoer/dag.html";
  });

  // 🗓 Planning (FIX)
  document.getElementById("planning")?.addEventListener("click", () => {
    window.location.href = "./planning.html";
  });

  // 🏆 Leaderboard (check waar hij staat)
  document.getElementById("leaderboard")?.addEventListener("click", () => {
    window.location.href = "./leaderboard.html";
  });

  // 💰 Financieel
  document.getElementById("financieel")?.addEventListener("click", () => {
    window.location.href = "./financieel.html";
  });

  // 🚪 Uitloggen
  document.getElementById("logout")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "/index.html";
  });

