import { requireAuth } from "../../utils/guards.js";
import { supabase } from "../../services/supabase.js";

document.addEventListener("DOMContentLoaded", async () => {
  // 🔐 Beveiliging
  await requireAuth();

  console.log("✅ Backend dashboard geladen");

  // hier komt later je dashboard-logica
});

  // 👥 Medewerkers
  document.getElementById("medewerkers")?.addEventListener("click", () => {
    window.location.href = "../medewerkers/medewerkers.html";
  });

  // 📅 Dag invoer
  document.getElementById("daginvoer")?.addEventListener("click", () => {
    window.location.href = "../daginvoer/dag.html";
  });

  // 🗓 Planning
  document.getElementById("planning")?.addEventListener("click", () => {
    window.location.href = "../planning/planning.html";
  });

  // 🏆 Leaderboard
  document.getElementById("leaderboard")?.addEventListener("click", () => {
    window.location.href = "../leaderboard/leaderboard.html";
  });

  // 🚪 Uitloggen
  document.getElementById("logout")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "../auth/login.html";
  });