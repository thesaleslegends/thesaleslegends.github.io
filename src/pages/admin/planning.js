import { supabase } from "../../services/supabase.js";

/* ===============================
   WEEK STATE
================================ */
let currentYear = 2026;
let currentWeek = 5;

/* ===============================
   DOM
================================ */
const weekLabel = document.getElementById("weekLabel");
const prevWeekBtn = document.getElementById("prevWeek");
const nextWeekBtn = document.getElementById("nextWeek");

/* ===============================
   INIT
================================ */
updateWeekLabel();
loadWeek();

/* ===============================
   WEEK NAVIGATIE
================================ */
prevWeekBtn.onclick = () => {
  currentWeek--;
  if (currentWeek < 1) {
    currentWeek = 52;
    currentYear--;
  }
  updateWeekLabel();
  loadWeek();
};

nextWeekBtn.onclick = () => {
  currentWeek++;
  if (currentWeek > 52) {
    currentWeek = 1;
    currentYear++;
  }
  updateWeekLabel();
  loadWeek();
};

function updateWeekLabel() {
  weekLabel.innerText = `Week ${currentWeek} (${currentYear})`;
}

/* ===============================
   DATA LADEN
================================ */
async function loadWeek() {
  // kolommen leegmaken
  document.querySelectorAll(".day-list").forEach(l => (l.innerHTML = ""));
  document.querySelectorAll(".summary-cell").forEach(c => (c.innerText = "0"));
  document.getElementById("weekTotal").innerText = "0";

  const { data: shifts, error } = await supabase
    .from("planning")
    .select(`
      id,
      day_of_week,
      half_day,
      employees ( name )
    `)
    .eq("year", currentYear)
    .eq("week_number", currentWeek);

  if (error) {
    console.error("Fout bij laden planning:", error);
    return;
  }

  renderWeek(shifts);
  calculateTotals(shifts);
}

/* ===============================
   RENDEREN
================================ */
function renderWeek(shifts) {
  shifts.forEach(shift => {
    const list = document.querySelector(
      `.day-column[data-day="${shift.day_of_week}"] .day-list`
    );
    if (!list) return;

    const li = document.createElement("li");
    li.textContent =
      shift.employees?.name + (shift.half_day ? " (½)" : "");

    list.appendChild(li);
  });
}

/* ===============================
   TOTALEN
================================ */
function calculateTotals(shifts) {
  const dagTotalen = { 1:0,2:0,3:0,4:0,5:0,6:0,7:0 };

  shifts.forEach(s => {
    dagTotalen[s.day_of_week] += s.half_day ? 0.5 : 1;
  });

  document.querySelectorAll(".summary-cell").forEach((cell, i) => {
    cell.innerText = dagTotalen[i + 1];
  });

  const weekTotaal = Object.values(dagTotalen)
    .reduce((a, b) => a + b, 0);

  document.getElementById("weekTotal").innerText = weekTotaal;
}

/* ===============================
   KNOPPEN ONDERAAN
================================ */
document.getElementById("openPlanner").onclick = () => {
  window.location.href = "/planning-admin.html";
};

document.getElementById("openVisual").onclick = () => {
  window.location.href = "/planning-visual.html";
};