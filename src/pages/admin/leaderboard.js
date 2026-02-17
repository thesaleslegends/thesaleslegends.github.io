import { supabase } from "../../services/supabase.js";

/* =========================
   PERIODE STATE
========================= */
let actievePeriode = localStorage.getItem("periode") || "week";

const periodToggle = document.getElementById("periodToggle");
const periodMenu = document.getElementById("periodMenu");
const subtitle = document.getElementById("leaderboardSubtitle");
const tbody = document.getElementById("leaderboardBody");

/* =========================
   PERIODE SELECTOR
========================= */
if (periodToggle && periodMenu) {
  periodToggle.addEventListener("click", () => {
    periodMenu.classList.toggle("open");
  });

  periodMenu.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      actievePeriode = btn.dataset.period;
      localStorage.setItem("periode", actievePeriode);
      renderLeaderboard();
    });
  });
}

/* =========================
   SUBTITLE
========================= */
function updateSubtitle() {
  if (!subtitle) return;

  const labels = {
    week: "WEEK LEADERBOARD",
    month: "MONTH LEADERBOARD",
    year: "YEAR LEADERBOARD"
  };

  subtitle.textContent = labels[actievePeriode] || "WEEK LEADERBOARD";
}

/* =========================
   PERIODE BEREKENING
========================= */
function berekenPeriode() {
  const nu = new Date();
  let start, eind;

  if (actievePeriode === "week") {
    const dag = nu.getDay() || 7;
    start = new Date(nu);
    start.setDate(nu.getDate() - dag + 1);
    start.setHours(0, 0, 0, 0);

    eind = new Date(start);
    eind.setDate(start.getDate() + 6);
    eind.setHours(23, 59, 59, 999);
  }

  if (actievePeriode === "month") {
    start = new Date(nu.getFullYear(), nu.getMonth(), 1);
    eind = new Date(nu.getFullYear(), nu.getMonth() + 1, 0);
    eind.setHours(23, 59, 59, 999);
  }

  if (actievePeriode === "year") {
    start = new Date(nu.getFullYear(), 0, 1);
    eind = new Date(nu.getFullYear(), 11, 31);
    eind.setHours(23, 59, 59, 999);
  }

  return { start, eind };
}

/* =========================
   DATA LADEN
========================= */
async function laadData() {

  const { start, eind } = berekenPeriode();

  const startISO = start.toISOString().split("T")[0];
  const eindISO = eind.toISOString().split("T")[0];

  // 🔥 1. Alle medewerkers ophalen (betrouwbaarste manier)
  const { data: medewerkers } = await supabase
    .from("medewerkers")
    .select("id, naam");

  const medewerkersMap = {};
  (medewerkers ?? []).forEach(m => {
    medewerkersMap[m.id] = m.naam;
  });

  // 🔥 2. Planning
  const { data: planning } = await supabase
    .from("planning")
    .select("employee_id, half_day, datum")
    .gte("datum", startISO)
    .lte("datum", eindISO);

  // 🔥 3. Orders
  const { data: invoer } = await supabase
    .from("dag_invoer")
    .select("employee_id, status, datum")
    .gte("datum", startISO)
    .lte("datum", eindISO);

  return {
    planning: planning ?? [],
    invoer: invoer ?? [],
    medewerkersMap
  };
}

/* =========================
   STATS BOUWEN
========================= */
function bouwStats(planning, invoer, medewerkersMap) {

  const stats = {};

  /* =========================
     SHIFTS (planning)
  ========================= */
  planning.forEach(p => {

    if (!stats[p.employee_id]) {
      stats[p.employee_id] = {
        id: p.employee_id,
        naam: medewerkersMap[p.employee_id] || "Onbekend",
        shifts: 0,
        bruto: 0,
        netto: 0,
        werkdagen: new Set()
      };
    }

    stats[p.employee_id].shifts += p.half_day ? 0.5 : 1;
  });

  /* =========================
     ORDERS
  ========================= */
  invoer.forEach(i => {

    if (!stats[i.employee_id]) {
      stats[i.employee_id] = {
        id: i.employee_id,
        naam: medewerkersMap[i.employee_id] || "Onbekend",
        shifts: 0,
        bruto: 0,
        netto: 0,
        werkdagen: new Set()
      };
    }

    // 🔥 Unieke werkdagen bijhouden
    stats[i.employee_id].werkdagen.add(i.datum);

    if (i.status === "Bruto") {
      stats[i.employee_id].bruto += 1;
    }

    if (i.status === "Netto") {
      stats[i.employee_id].netto += 1;
      stats[i.employee_id].bruto += 1;
    }
  });

  return Object.values(stats).map(p => {

    // 🔥 Als planning shifts 0 zijn, gebruik unieke werkdagen
    const effectieveShifts =
      p.shifts > 0 ? p.shifts : p.werkdagen.size;

    return {
      ...p,
      shifts: effectieveShifts,
      brutoGem: effectieveShifts ? p.bruto / effectieveShifts : 0,
      nettoGem: effectieveShifts ? p.netto / effectieveShifts : 0
    };
  });
}

/* =========================
   RENDER
========================= */
async function renderLeaderboard() {

  updateSubtitle();

  const { planning, invoer, medewerkersMap } = await laadData();
  const data = bouwStats(planning, invoer, medewerkersMap);

  // SORTEREN
  data.sort((a, b) => {
    if (b.nettoGem !== a.nettoGem)
      return b.nettoGem - a.nettoGem;

    if (b.brutoGem !== a.brutoGem)
      return b.brutoGem - a.brutoGem;

    return a.naam.localeCompare(b.naam);
  });

  tbody.innerHTML = "";

  /* TOP PERFORMER */
  if (data.length > 0) {
    document.getElementById("top-naam").textContent = data[0].naam;
    document.getElementById("top-bruto-gem").textContent =
      data[0].brutoGem.toFixed(2);
    document.getElementById("top-netto-gem").textContent =
      data[0].nettoGem.toFixed(2);
  }

  /* TEAM TOTALS */
  let totaalBruto = 0;
  let totaalNetto = 0;
  let totaalShifts = 0;

  data.forEach(p => {
    totaalBruto += p.bruto;
    totaalNetto += p.netto;
    totaalShifts += p.shifts;
  });

  document.getElementById("totaal-bruto").textContent = totaalBruto;
  document.getElementById("totaal-netto").textContent = totaalNetto;
  document.getElementById("team-gem").textContent =
    totaalShifts ? (totaalNetto / totaalShifts).toFixed(2) : "0.00";

  /* TABEL */
  data.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.naam}</td>
      <td>${p.shifts}</td>
      <td>${p.bruto}</td>
      <td>${p.brutoGem.toFixed(2)}</td>
      <td>${p.netto}</td>
      <td>${p.nettoGem.toFixed(2)}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {
  if (tbody) renderLeaderboard();
});