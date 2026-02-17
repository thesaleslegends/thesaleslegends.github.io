

import { supabase } from "../../services/supabase.js";

/* =========================
   STATE
========================= */
let datumInput;
let regelsContainer;
let ingeplandeMedewerkers = [];
let dagHeeftPlanning = false;

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {
  datumInput = document.getElementById("dagDatum");
  regelsContainer = document.getElementById("regels");

  document.getElementById("addRow").addEventListener("click", () => {
    if (!dagHeeftPlanning) {
      alert("Geen medewerkers ingepland voor deze dag");
      return;
    }
    maakRegel();
  });

  document.getElementById("opslaanDag").addEventListener("click", () => {
    if (!dagHeeftPlanning) {
      alert("Je kan geen dag invoeren zonder planning");
      return;
    }
    opslaanDag();
  });

  datumInput.addEventListener("change", () => {
    laadDag(datumInput.value);
  });

  const vandaag = new Date().toISOString().split("T")[0];
  datumInput.value = vandaag;
  laadDag(vandaag);
});

/* =========================
   HELPERS
========================= */
function getDayOfWeek(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0 = zondag
  return day === 0 ? 7 : day;
}

/* =========================
   DAG LADEN
========================= */
async function laadDag(datum) {
  regelsContainer.innerHTML = "";
  ingeplandeMedewerkers = [];
  dagHeeftPlanning = false;

  const jaar = new Date(datum).getFullYear();
  const dagVanWeek = getDayOfWeek(datum);

  /* === PLANNING OPHALEN === */
  const { data: planning, error } = await supabase
    .from("planning")
    .select(`
      employee_id,
      medewerkers (
        id,
        naam
      )
    `)
    .eq("year", jaar)
    .eq("day_of_week", dagVanWeek);

  if (error) {
    console.error("❌ Planning fout:", error);
    regelsContainer.innerHTML = "<p>Fout bij laden planning</p>";
    return;
  }

  if (!planning || planning.length === 0) {
    regelsContainer.innerHTML = "<p>Geen medewerkers ingepland</p>";
    return;
  }

  dagHeeftPlanning = true;

// Maak unieke medewerkers op basis van employee_id
const uniekeMap = new Map();

planning.forEach(p => {
  if (p.medewerkers && p.employee_id) {
    uniekeMap.set(p.employee_id, p.medewerkers);
  }
});

ingeplandeMedewerkers = Array.from(uniekeMap.values());

  /* === BESTAANDE DAG_INVOER === */
  const { data: dagInvoer, error: dagError } = await supabase
    .from("dag_invoer")
    .select("*")
    .eq("datum", datum);

  if (dagError) {
    console.error("❌ Dag invoer fout:", dagError);
  }

  if (dagInvoer && dagInvoer.length > 0) {
    dagInvoer.forEach(record => maakRegelMetData(record));
  } else {
    maakRegel();
  }
}

/* =========================
   REGEL MAKEN
========================= */
function maakRegel() {
  maakRegelMetData(null);
}

function maakRegelMetData(data) {
  const row = document.createElement("div");
  row.className = "row";

  row.innerHTML = `
    <select class="medewerker">
      <option value="">Medewerker</option>
    </select>

    <button type="button" class="type-btn bruto">Bruto</button>

    <input class="opmerking" placeholder="Opmerking">
  `;

  const medewerkerSelect = row.querySelector(".medewerker");
  const statusBtn = row.querySelector(".type-btn");
  const opmerkingInput = row.querySelector(".opmerking");

  ingeplandeMedewerkers.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.naam;
    medewerkerSelect.appendChild(opt);
  });

  if (data) {
    medewerkerSelect.value = data.employee_id;

    if (data.status === "Netto") {
      statusBtn.classList.remove("bruto");
      statusBtn.classList.add("netto");
      statusBtn.textContent = "Netto";
    }

    opmerkingInput.value = data.opmerking || "";
  }

  statusBtn.addEventListener("click", () => {
    statusBtn.classList.toggle("bruto");
    statusBtn.classList.toggle("netto");
    statusBtn.textContent =
      statusBtn.classList.contains("netto") ? "Netto" : "Bruto";
  });

  regelsContainer.appendChild(row);
}

/* =========================
   OPSLAAN
========================= */
async function opslaanDag() {
  const datum = datumInput.value;

  await supabase
    .from("dag_invoer")
    .delete()
    .eq("datum", datum);

  const rows = regelsContainer.querySelectorAll(".row");
  const inserts = [];

  rows.forEach(row => {
    const medewerkerId = row.querySelector(".medewerker").value;
    if (!medewerkerId) return;

    inserts.push({
      datum,
      employee_id: medewerkerId,
      status: row.querySelector(".type-btn").classList.contains("netto")
        ? "Netto"
        : "Bruto",
      opmerking: row.querySelector(".opmerking").value || ""
    });
  });

  if (inserts.length === 0) return;

  const { error } = await supabase
    .from("dag_invoer")
    .insert(inserts);

  if (error) {
    console.error(error);
    alert("Opslaan mislukt");
    return;
  }

  alert("✅ Dag opgeslagen");
}
