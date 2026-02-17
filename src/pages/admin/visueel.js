import { supabase } from "../../services/supabase.js";

const grid = document.getElementById("planningGrid");

if (!grid) {
  console.error("planningGrid element niet gevonden");
  throw new Error("planningGrid ontbreekt in HTML");
}

/* ===============================
   HUIDIGE WEEK BEREKENEN (ISO)
================================ */
function getCurrentWeekISO() {
  const now = new Date();

  const target = new Date(now.valueOf());
  const dayNr = (now.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);

  const firstThursday = target.valueOf();

  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }

  const week =
    1 + Math.ceil((firstThursday - target) / 604800000);

  return {
    year: now.getFullYear(),
    week
  };
}

/* ===============================
   VOLGENDE WEEK BEREKENEN
================================ */
function getNextWeekISO() {
  const current = getCurrentWeekISO();

  let nextWeek = current.week + 1;
  let nextYear = current.year;

  // Jaarovergang fix
  if (nextWeek > 52) {
    nextWeek = 1;
    nextYear++;
  }

  return {
    year: nextYear,
    week: nextWeek
  };
}

// 🔥 Hier pakken we ALTIJD volgende week
const next = getNextWeekISO();
const year = next.year;
const week = next.week;

console.log("VOLGENDE WEEK:", year, week);

/* ===============================
   DAGEN
================================ */
const DAYS = [
  { label: "Maandag", value: 1 },
  { label: "Dinsdag", value: 2 },
  { label: "Woensdag", value: 3 },
  { label: "Donderdag", value: 4 },
  { label: "Vrijdag", value: 5 },
  { label: "Zaterdag", value: 6 },
  { label: "Zondag", value: 7 }
];

/* ===============================
   DATA LADEN
================================ */
async function loadVisualPlanning() {
  const { data: shifts, error } = await supabase
    .from("planning")
    .select(`
      day_of_week,
      half_day,
      medewerkers ( naam )
    `)
    .eq("year", year)
    .eq("week_number", week);

  if (error) {
    console.error(error);
    grid.innerHTML = "Fout bij laden";
    return;
  }

  const perDag = {};
  DAYS.forEach(d => (perDag[d.value] = []));

  shifts.forEach(s => {
    if (s.medewerkers?.naam) {
      const label =
        s.medewerkers.naam + (s.half_day ? " (½)" : "");
      perDag[s.day_of_week].push(label);
    }
  });

  renderGrid(perDag);
}

/* ===============================
   RENDER
================================ */
function renderGrid(perDag) {
  grid.innerHTML = "";

  // Headers
  DAYS.forEach(d => {
    grid.innerHTML += `<div class="cell header">${d.label}</div>`;
  });

  // Kolommen
  DAYS.forEach(d => {
    grid.innerHTML += `
      <div class="cell">
        ${perDag[d.value]
          .map(name => `<div class="name-cell">${name}</div>`)
          .join("")}
      </div>
    `;
  });
}

/* ===============================
   INIT
================================ */
loadVisualPlanning();