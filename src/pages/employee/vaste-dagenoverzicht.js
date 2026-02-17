import { supabase } from "/src/services/supabase.js";

/* =========================
   DROPDOWN
========================= */
function initDropdown() {

  const dropdown = document.querySelector(".dropdown");
  const dropdownBtn = document.querySelector(".dropdown-btn");

  if (!dropdown || !dropdownBtn) return;

  dropdownBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("open");
  });

  document.addEventListener("click", () => {
    dropdown.classList.remove("open");
  });
}

/* =========================
   INIT PAGINA
========================= */
async function initPagina() {

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const lijstEl = document.getElementById("vasteDagenLijst");
  if (!lijstEl) return;

  const { data: medewerker } = await supabase
    .from("medewerkers")
    .select("vaste_dagen")
    .eq("auth_user_id", user.id)
    .single();

  if (!medewerker || !medewerker.vaste_dagen || medewerker.vaste_dagen.length === 0) {
    lijstEl.innerHTML = "<p>Geen vaste dagen ingesteld.</p>";
    return;
  }

  const dagNamen = {
    1: "Maandag",
    2: "Dinsdag",
    3: "Woensdag",
    4: "Donderdag",
    5: "Vrijdag",
    6: "Zaterdag",
    7: "Zondag"
  };

  lijstEl.innerHTML = "";

  medewerker.vaste_dagen.forEach(dagNummer => {

    const div = document.createElement("div");
    div.className = "result-item";

    div.innerHTML = `
      <span class="result-label">${dagNamen[dagNummer]}</span>
    `;

    lijstEl.appendChild(div);
  });
}

/* =========================
   START
========================= */

initDropdown();
initPagina();