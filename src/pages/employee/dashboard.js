import { supabase } from "../../services/supabase.js";

/* =========================
   HELPERS
========================= */
function startVanWeek(d) {
  const date = new Date(d);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function eindeVanWeek(start) {
  const date = new Date(start);
  date.setDate(start.getDate() + 6);
  date.setHours(23, 59, 59, 999);
  return date;
}

function inHuidigeWeek(datum, vandaag) {
  const start = startVanWeek(vandaag);
  const eind = eindeVanWeek(start);
  const d = new Date(datum);
  return d >= start && d <= eind;
}

function inLoonperiode(datum, vandaag) {
  const d = new Date(datum);
  let start, eind;

  if (vandaag.getDate() >= 26) {
    start = new Date(vandaag.getFullYear(), vandaag.getMonth(), 26);
    eind = new Date(vandaag.getFullYear(), vandaag.getMonth() + 1, 25);
  } else {
    start = new Date(vandaag.getFullYear(), vandaag.getMonth() - 1, 26);
    eind = new Date(vandaag.getFullYear(), vandaag.getMonth(), 25);
  }

  start.setHours(0, 0, 0, 0);
  eind.setHours(23, 59, 59, 999);

  return d >= start && d <= eind;
}

function formatDag(datum) {
  return new Date(datum).toLocaleDateString("nl-NL", { weekday: "long" });
}

function formatDatum(datum) {
  return new Date(datum).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit"
  });
}

/* =========================
   INIT DASHBOARD
========================= */
async function initDashboard() {

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("❌ Geen ingelogde gebruiker");
    return;
  }

  const naamEl = document.getElementById("medewerkerNaam");
  const functieEl = document.getElementById("medewerkerFunctie");
  const embleemEl = document.getElementById("functieEmbleem");

  const weekEl = document.getElementById("weekVerdiensten");
  const maandEl = document.getElementById("maandVerdiensten");
  const planningEl = document.getElementById("planningLijst");

  const hoogsteNettoEl = document.getElementById("hoogsteNetto");
  const hoogsteBrutoEl = document.getElementById("hoogsteBruto");
  const nettoGemiddeldeEl = document.getElementById("nettoGemiddelde");

  if (!naamEl || !weekEl || !maandEl || !planningEl) {
    console.error("❌ DOM-elementen ontbreken");
    return;
  }

  /* =========================
     MEDEWERKER
  ========================= */
  const { data: medewerker, error: medewerkerError } = await supabase
    .from("medewerkers")
    .select("id, naam, functie, basis_dagloon, bonus_per_netto")
    .eq("auth_user_id", user.id)
    .single();

  if (medewerkerError || !medewerker) {
    console.error("❌ Geen medewerker gevonden", medewerkerError);
    return;
  }

  naamEl.textContent = medewerker.naam;


/* =========================
   FUNCTIE + EMBLEEM
========================= */
if (functieEl) {
  functieEl.textContent = medewerker.functie || "";
}

if (embleemEl && medewerker.functie) {

  const functie = medewerker.functie.toLowerCase().trim();

  if (functie.includes("sales starter")) {
    embleemEl.src = "/src/assets/images/sales-starter.png";
  } 
  else if (functie.includes("junior legend")) {
    embleemEl.src = "/src/assets/images/junior-legend.png";
  } 
  else if (functie.includes("sales legend")) {
    embleemEl.src = "/src/assets/images/sales-legend.png";
  } 
  else {
    embleemEl.style.display = "none";
  }
}

  const vandaag = new Date();

  /* =========================
     SHIFTS
  ========================= */
  const { data: shifts, error: shiftsError } = await supabase
    .from("planning")
    .select("datum, half_day")
    .eq("employee_id", medewerker.id)
    .order("datum", { ascending: true });

  if (shiftsError) {
    console.error("❌ Fout bij shifts", shiftsError);
    return;
  }

  let weekBasis = 0;
  let loonBasis = 0;
  const gewerkteDatums = new Set();

  (shifts || []).forEach(shift => {

  const shiftDatum = new Date(shift.datum);
  const vandaagCheck = new Date();

  // Maak vandaag zonder tijd
  const vandaagMiddernacht = new Date();
  vandaagMiddernacht.setHours(0, 0, 0, 0);

  // Maak 12:00 vandaag
  const vandaagTwaalf = new Date();
  vandaagTwaalf.setHours(12, 0, 0, 0);

  // 🔥 Alleen meetellen als:
  // - datum in verleden ligt
  // - OF vandaag is EN het is 12:00 of later

  const isVerleden = shiftDatum < vandaagMiddernacht;
  const isVandaagNa12 =
    shiftDatum.getTime() === vandaagMiddernacht.getTime() &&
    vandaagCheck >= vandaagTwaalf;

  if (!isVerleden && !isVandaagNa12) {
    return; // nog niet meetellen
  }

  gewerkteDatums.add(shift.datum);

  const dagloon = shift.half_day
    ? medewerker.basis_dagloon / 2
    : medewerker.basis_dagloon;

  if (inHuidigeWeek(shift.datum, vandaag)) weekBasis += dagloon;
  if (inLoonperiode(shift.datum, vandaag)) loonBasis += dagloon;
});

  /* =========================
     BONUS
  ========================= */
  const { data: dagen, error: dagenError } = await supabase
    .from("dag_invoer")
    .select("datum, employee_id, status");

  if (dagenError) {
    console.error("❌ Fout bij dagen", dagenError);
    return;
  }

  let weekBonus = 0;
  let loonBonus = 0;

  (dagen || []).forEach(dag => {

    if (!gewerkteDatums.has(dag.datum)) return;
    if (dag.employee_id !== medewerker.id) return;
    if (dag.status?.trim().toLowerCase() !== "netto") return;

    const bonus = medewerker.bonus_per_netto;

    if (inHuidigeWeek(dag.datum, vandaag)) weekBonus += bonus;
    if (inLoonperiode(dag.datum, vandaag)) loonBonus += bonus;
  });

  /* =========================
     TOTALEN
  ========================= */
  weekEl.textContent = `€${weekBasis + weekBonus}`;
  maandEl.textContent = `€${loonBasis + loonBonus}`;

 /* =========================
   RESULTATEN BEREKENEN
========================= */

let hoogsteNetto = 0;
let hoogsteBruto = 0;
let totaalNetto = 0;

// we groeperen per dag
const dagStatistieken = {};

// verzamel alle dag data van deze medewerker
(dagen || []).forEach(dag => {

  if (dag.employee_id !== medewerker.id) return;

  const datum = dag.datum;

  if (!dagStatistieken[datum]) {
    dagStatistieken[datum] = {
      netto: 0,
      bruto: 0
    };
  }

  const status = dag.status?.trim().toLowerCase();

  if (status === "netto") {
    dagStatistieken[datum].netto += 1;
    dagStatistieken[datum].bruto += 1; // netto telt ook als bruto
    totaalNetto += 1;
  }

  if (status === "bruto") {
    dagStatistieken[datum].bruto += 1;
  }
});

// bepaal hoogste scores per dag
Object.values(dagStatistieken).forEach(dag => {

  if (dag.netto > hoogsteNetto) {
    hoogsteNetto = dag.netto;
  }

  if (dag.bruto > hoogsteBruto) {
    hoogsteBruto = dag.bruto;
  }
});

/* =========================
   NETTO GEMIDDELDE (CORRECT + GEEN TOEKOMST)
========================= */

const vandaagMiddernachtGem = new Date();
vandaagMiddernachtGem.setHours(0, 0, 0, 0);

// 🔥 Alle planning ophalen met half_day
const { data: alleShifts } = await supabase
  .from("planning")
  .select("datum, half_day")
  .eq("employee_id", medewerker.id);

let totaalShiftsAlleTijd = 0;

(alleShifts || []).forEach(shift => {
  const shiftDatum = new Date(shift.datum);

  // alleen vandaag en verleden
  if (shiftDatum <= vandaagMiddernachtGem) {
    totaalShiftsAlleTijd += shift.half_day ? 0.5 : 1;
  }
});

// 🔥 Alle netto orders ooit ophalen
const { data: alleDagen } = await supabase
  .from("dag_invoer")
  .select("status")
  .eq("employee_id", medewerker.id);

let totaalNettoAlleTijd = 0;

(alleDagen || []).forEach(d => {
  if (d.status?.trim().toLowerCase() === "netto") {
    totaalNettoAlleTijd += 1;
  }
});

const nettoGemiddelde =
  totaalShiftsAlleTijd > 0
    ? (totaalNettoAlleTijd / totaalShiftsAlleTijd).toFixed(2)
    : "0.00";

// output naar DOM
if (hoogsteNettoEl) hoogsteNettoEl.textContent = hoogsteNetto;
if (hoogsteBrutoEl) hoogsteBrutoEl.textContent = hoogsteBruto;
if (nettoGemiddeldeEl) nettoGemiddeldeEl.textContent = nettoGemiddelde;
  /* =========================
     PLANNING
  ========================= */
  planningEl.innerHTML = "";

  const vandaagMiddernacht = new Date();
  vandaagMiddernacht.setHours(0, 0, 0, 0);

  const toekomstigeShifts = (shifts || []).filter(
    s => new Date(s.datum) >= vandaagMiddernacht
  );

  if (toekomstigeShifts.length === 0) {
    planningEl.innerHTML = "<p>Geen ingeplande diensten</p>";
  } else {
    toekomstigeShifts.forEach(shift => {
      const div = document.createElement("div");
      div.className = "planning-item";

      div.innerHTML = `
        <strong>${formatDag(shift.datum)}</strong>
        <span>${formatDatum(shift.datum)}</span>
        <span>${shift.half_day ? "Halve shift" : "Hele shift"}</span>
      `;

      planningEl.appendChild(div);
    });
  }

  const leaderboardBtn = document.getElementById("leaderboardBtn");

  if (leaderboardBtn) {
    leaderboardBtn.addEventListener("click", () => {
      window.location.href = "src/pages/admin/leaderboard.html";
    });
  }

  console.log("Week basis:", weekBasis);
  console.log("Week bonus:", weekBonus);
  console.log("Loon basis:", loonBasis);
  console.log("Loon bonus:", loonBonus);
}
/* =========================
   DROPDOWN MENU
========================= */
/* =========================
   TOPBAR DROPDOWN FIX
========================= */

document.addEventListener("DOMContentLoaded", () => {

  const dropdown = document.querySelector(".dropdown");
  const dropdownBtn = document.querySelector(".dropdown-btn");
  const dropdownContent = document.querySelector(".dropdown-content");

  if (!dropdown || !dropdownBtn || !dropdownContent) return;

  dropdownBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("open");
    }
  });

});

initDashboard();