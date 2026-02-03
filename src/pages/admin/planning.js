import { supabase } from "../../services/supabase.js";

console.log("🔥 Weekplanning geladen");

// =========================
// STATE
// =========================
let currentWeekStart = getMonday(new Date());
let medewerkers = [];
let shifts = [];

// =========================
// INIT
// =========================
document.addEventListener("DOMContentLoaded", async () => {
  await laadMedewerkers();
  await laadWeek();
});

// =========================
// WEEK LADEN
// =========================
async function laadWeek() {
  const weekStart = formatDate(currentWeekStart);
  const weekEnd = formatDate(addDays(currentWeekStart, 6));

  console.log("📅 Week laden:", weekStart, "t/m", weekEnd);

  const { data, error } = await supabase
    .from("shifts")
    .select("medewerker_id, datum, type")
    .gte("datum", weekStart)
    .lte("datum", weekEnd);

  if (error) {
    console.error("❌ Fout bij laden shifts:", error);
    return;
  }

  shifts = data || [];
  renderWeek();
}

// =========================
// MEDEWERKERS LADEN
// =========================
async function laadMedewerkers() {
  const { data, error } = await supabase
    .from("medewerkers")
    .select("id, naam")
    .eq("actief", true)
    .order("naam");

  if (error) {
    console.error("❌ Fout bij laden medewerkers:", error);
    return;
  }

  medewerkers = data || [];
}

// =========================
// RENDER WEEK
// =========================
function renderWeek() {
  let totaal = 0;

  for (let i = 0; i < 7; i++) {
    const dag = addDays(currentWeekStart, i);
    const datum = formatDate(dag);
    const dagContainer = document.querySelector(
      `[data-datum="${datum}"]`
    );

    if (!dagContainer) continue;

    const dagShifts = shifts.filter(s => s.datum === datum);
    totaal += dagShifts.length;

    dagContainer.innerHTML = "";

dagShifts.forEach(shift => {
  const el = document.createElement("div");
  el.className = "shift";
  el.innerHTML = `
    ${shift.medewerkers?.naam || "Onbekend"}
    <span class="remove" data-id="${shift.id}">✖</span>
  `;
  dagContainer.appendChild(el);
});

    updateDagTeller(datum, dagShifts.length);
  }

  document.getElementById("weekTotal").innerText = totaal;
  bindRemoveEvents();
}

// =========================
// REMOVE SHIFT
// =========================
function bindRemoveEvents() {
  document.querySelectorAll(".remove").forEach(btn => {
    btn.addEventListener("click", async e => {
      const medewerkerId = e.target.dataset.id;
      const datum = e.target.dataset.datum;

      await supabase
        .from("shifts")
        .delete()
        .eq("medewerker_id", medewerkerId)
        .eq("datum", datum);

      await laadWeek();
    });
  });
}

// =========================
// HELPERS
// =========================
function updateDagTeller(datum, aantal) {
  const teller = document.querySelector(
    `[data-teller="${datum}"]`
  );
  if (teller) teller.innerText = aantal;
}

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date) {
  return date.toISOString().split("T")[0];
}