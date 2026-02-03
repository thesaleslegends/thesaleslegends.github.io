import { supabase } from "../../services/supabase.js";

console.log("🔥 planning.js geladen", new Date().toISOString());

// =========================
// DOM ELEMENTEN
// =========================
const container = document.getElementById("medewerkersContainer");
const datumInput = document.getElementById("planningDatum");
const opslaanBtn = document.getElementById("opslaanPlanning");

// =========================
// INIT
// =========================
document.addEventListener("DOMContentLoaded", async () => {
  datumInput.valueAsDate = new Date();

  await laadMedewerkers();
  await laadPlanningVoorDatum(datumInput.value);

  datumInput.addEventListener("change", () => {
    laadPlanningVoorDatum(datumInput.value);
  });
});

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

  renderMedewerkers(data);
}

// =========================
// MEDEWERKERS RENDEREN
// =========================
function renderMedewerkers(medewerkers) {
  container.innerHTML = "";

  medewerkers.forEach(({ id, naam }) => {
    const row = document.createElement("div");
    row.className = "row";
    row.dataset.medewerkerId = id;

    row.innerHTML = `
      <strong>${naam}</strong>

      <label>
        <input type="radio" name="shift_${id}" value="">
        Niet ingepland
      </label>

      <label>
        <input type="radio" name="shift_${id}" value="full">
        Hele dag
      </label>

      <label>
        <input type="radio" name="shift_${id}" value="half">
        Halve dag
      </label>
    `;

    container.appendChild(row);
  });
}

// =========================
// OPSLAAN PLANNING
// =========================
opslaanBtn.addEventListener("click", async () => {
  const datum = datumInput.value;
  if (!datum) {
    alert("Kies een datum");
    return;
  }

  const rows = document.querySelectorAll(".row");

  for (const row of rows) {
    const gekozen = row.querySelector("input[type='radio']:checked");
    if (!gekozen) continue;

    const medewerkerId = row.dataset.medewerkerId;
    const type = gekozen.value;

    await slaPlanningOp(medewerkerId, datum, type);
  }

  alert("✅ Planning opgeslagen");
});

// =========================
// PLANNING OPSLAAN
// =========================
async function slaPlanningOp(medewerkerId, datum, type) {
  const { error } = await supabase
    .from("shifts")
    .upsert(
      {
        medewerker_id: medewerkerId,
        datum,
        type
      },
      {
        onConflict: "medewerker_id,datum"
      }
    );

  if (error) {
    console.error("❌ Fout bij opslaan planning:", error);
  }
}

// =========================
// PLANNING LADEN
// =========================
async function laadPlanningVoorDatum(datum) {
  if (!datum) return;

  console.log("📅 Planning laden voor", datum);

  const { data, error } = await supabase
    .from("shifts")
    .select("medewerker_id, type")
    .eq("datum", datum);

  if (error) {
    console.error("❌ Fout bij laden planning:", error);
    return;
  }

  // reset alles
  document
    .querySelectorAll("input[type='radio']")
    .forEach(radio => (radio.checked = false));

  // toepassen bestaande planning
  data.forEach(({ medewerker_id, type }) => {
    const row = document.querySelector(
      `.row[data-medewerker-id="${medewerker_id}"]`
    );

    if (!row) return;

    const radio = row.querySelector(
      `input[type="radio"][value="${type}"]`
    );

    if (radio) radio.checked = true;
  });

  console.log("✅ Planning toegepast:", data);
}