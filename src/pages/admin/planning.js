import { supabase } from "../../services/supabase.js";

/* ===============================
   HELPERS
================================ */
function getDateFromWeek(year, week, dayOfWeek) {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const day = simple.getDay();
  const ISOweekStart = simple;

  if (day <= 4)
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());

  ISOweekStart.setDate(ISOweekStart.getDate() + (dayOfWeek - 1));

  return ISOweekStart; // DATE object (geen string!)
}

function formatLocalDate(dateObj) {
  return (
    dateObj.getFullYear() +
    "-" +
    String(dateObj.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(dateObj.getDate()).padStart(2, "0")
  );
}

/* ===============================
   WEEK STATE
================================ */
let currentYear = 2026;
let currentWeek = 5;
let activeDay = null;
let shiftToDelete = null;

/* ===============================
   DOM
================================ */
const weekLabel = document.getElementById("weekLabel");
const prevWeekBtn = document.getElementById("prevWeek");
const nextWeekBtn = document.getElementById("nextWeek");

const modal = document.getElementById("planModal");
const employeeSelect = document.getElementById("employeeSelect");
const halfDayCheckbox = document.getElementById("halfDayCheckbox");
const saveShiftBtn = document.getElementById("saveShift");
const closeModalBtn = document.getElementById("cancelShift");

const deleteModal = document.getElementById("deleteModal");
const confirmDeleteBtn = document.getElementById("confirmDelete");
const cancelDeleteBtn = document.getElementById("cancelDelete");

const loadFixedDaysBtn = document.getElementById("loadFixedDays");
const visualBtn = document.getElementById("visualOverview");

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
   MEDEWERKERS LADEN
================================ */
async function loadEmployees() {
  const { data, error } = await supabase
    .from("medewerkers")
    .select("id, naam")
    .eq("actief", true)
    .order("naam");

  if (error) {
    console.error(error);
    return;
  }

  employeeSelect.innerHTML = `<option value="">Kies medewerker</option>`;

  data.forEach(emp => {
    const opt = document.createElement("option");
    opt.value = emp.id;
    opt.textContent = emp.naam;
    employeeSelect.appendChild(opt);
  });
}

/* ===============================
   WEEK LADEN
================================ */
async function loadWeek() {
  document.querySelectorAll(".day-list").forEach(l => l.innerHTML = "");
  document.querySelectorAll(".summary-cell").forEach(c => c.innerText = "0");
  document.getElementById("weekTotal").innerText = "0";

  const { data: shifts, error } = await supabase
    .from("planning")
    .select(`
      id,
      day_of_week,
      half_day,
      medewerkers ( naam )
    `)
    .eq("year", currentYear)
    .eq("week_number", currentWeek);

  if (error) {
    console.error(error);
    return;
  }

  renderWeek(shifts || []);
  calculateTotals(shifts || []);
}

/* ===============================
   RENDER WEEK
================================ */
function renderWeek(shifts) {
  shifts.forEach(shift => {
    const list = document.querySelector(
      `.day-column[data-day="${shift.day_of_week}"] .day-list`
    );
    if (!list) return;

    const li = document.createElement("li");
    li.textContent =
      shift.medewerkers?.naam + (shift.half_day ? " (½)" : "");

    li.style.cursor = "pointer";
    li.onclick = () => {
      shiftToDelete = shift.id;
      deleteModal.style.display = "flex";
    };

    list.appendChild(li);
  });
}

/* ===============================
   TOTALEN
================================ */
function calculateTotals(shifts) {
  const totals = {1:0,2:0,3:0,4:0,5:0,6:0,7:0};

  shifts.forEach(s => {
    totals[s.day_of_week] += s.half_day ? 0.5 : 1;
  });

  document.querySelectorAll(".summary-cell").forEach((c, i) => {
    c.innerText = totals[i + 1];
  });

  document.getElementById("weekTotal").innerText =
    Object.values(totals).reduce((a,b)=>a+b,0);
}

/* ===============================
   PLUSJE → MODAL
================================ */
document.querySelectorAll(".add-btn").forEach(btn => {
  btn.onclick = async () => {
    activeDay = Number(btn.closest(".day-column").dataset.day);
    await loadEmployees();
    modal.style.display = "flex";
  };
});

/* ===============================
   MODAL SLUITEN
================================ */
closeModalBtn.onclick = () => {
  modal.style.display = "none";
  halfDayCheckbox.checked = false;
  employeeSelect.value = "";
  activeDay = null;
};

/* ===============================
   OPSLAAN SHIFT
================================ */
saveShiftBtn.onclick = async () => {
  if (!activeDay || !employeeSelect.value) return;

  const dateObj = getDateFromWeek(
    currentYear,
    currentWeek,
    activeDay
  );

  const datum = formatLocalDate(dateObj);

  const { error } = await supabase
    .from("planning")
    .insert({
      year: currentYear,
      week_number: currentWeek,
      day_of_week: activeDay,
      datum: datum,
      employee_id: employeeSelect.value,
      half_day: halfDayCheckbox.checked,
    });

  if (error) {
    alert("Fout bij opslaan");
    console.error(error);
    return;
  }

  modal.style.display = "none";
  halfDayCheckbox.checked = false;
  employeeSelect.value = "";
  loadWeek();
};

/* ===============================
   DELETE
================================ */
cancelDeleteBtn.onclick = () => {
  deleteModal.style.display = "none";
  shiftToDelete = null;
};

confirmDeleteBtn.onclick = async () => {
  if (!shiftToDelete) return;

  const { error } = await supabase
    .from("planning")
    .delete()
    .eq("id", shiftToDelete);

  if (error) {
    alert("Fout bij verwijderen");
    console.error(error);
    return;
  }

  deleteModal.style.display = "none";
  shiftToDelete = null;
  loadWeek();
};

/* ===============================
   VASTE DAGEN
================================ */
async function loadFixedDaysForWeek() {
  const { data: employees, error } = await supabase
    .from("medewerkers")
    .select("id, vaste_dagen")
    .eq("actief", true)
    .not("vaste_dagen", "is", null);

  if (error) return console.error(error);

  const { data: existingShifts } = await supabase
    .from("planning")
    .select("employee_id, day_of_week")
    .eq("year", currentYear)
    .eq("week_number", currentWeek);

  const existingMap = new Set(
    (existingShifts || []).map(s => `${s.employee_id}-${s.day_of_week}`)
  );

  const newShifts = [];

  employees.forEach(emp => {
    emp.vaste_dagen.forEach(day => {
      const key = `${emp.id}-${day}`;
      if (!existingMap.has(key)) {
        const dateObj = getDateFromWeek(currentYear, currentWeek, day);
        newShifts.push({
          year: currentYear,
          week_number: currentWeek,
          day_of_week: day,
          datum: formatLocalDate(dateObj),
          employee_id: emp.id,
          half_day: false
        });
      }
    });
  });

  if (newShifts.length === 0) return;

  const { error: insertError } = await supabase
    .from("planning")
    .insert(newShifts);

  if (insertError) return console.error(insertError);

  loadWeek();
}

if (loadFixedDaysBtn)
  loadFixedDaysBtn.onclick = loadFixedDaysForWeek;

if (visualBtn) {
  visualBtn.onclick = () => {
    window.location.href = "/src/pages/admin/visueel.html";
  };
}