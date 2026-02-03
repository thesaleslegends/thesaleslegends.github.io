import { requireAuth } from "../../utils/guards.js";


document.addEventListener("DOMContentLoaded", async () => {
  await requireAuth();

  const data = await getAdminStats();
  console.log("ADMIN DATA:", data);
});

import { requireAuth } from "../../utils/guards.js";
import { supabase } from "../../services/supabase.js";

document.addEventListener("DOMContentLoaded", async () => {
  await requireAuth();

  // Navigatie
  document.getElementById("medewerkers").onclick = () => {
    window.location.href = "../medewerkers/medewerkers.html";
  };

  document.getElementById("daginvoer").onclick = () => {
    window.location.href = "../daginvoer/dag.html";
  };

  document.getElementById("planning").onclick = () => {
    window.location.href = "../planning/planning.html";
  };

  document.getElementById("leaderboard").onclick = () => {
    window.location.href = "../leaderboard/leaderboard.html";
  };

  // Logout
  document.getElementById("logout").onclick = async () => {
    await supabase.auth.signOut();
    window.location.href = "../auth/login.html";
  };
});