import { supabase } from "../../services/supabase.js";

/* =========================
   DOM
========================= */
const bodyEl = document.getElementById("prognoseBody");

/* =========================
   DATA LADEN
========================= */
async function laadPrognose() {
  const { data, error } = await supabase
    .from("prognose_weken")
    .select("id, week, behaald")
    .order("week");

  if (error) {
    console.error("Fout bij laden prognose:", error);
    return;
  }

  render(data);
}

/* =========================
   RENDER
========================= */
function render(weken) {
  bodyEl.innerHTML = "";

  weken.forEach(w => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>Week ${w.week}</td>
      <td>
        <input
          type="checkbox"
          ${w.behaald ? "checked" : ""}
          data-id="${w.id}"
        />
      </td>
    `;

    const checkbox = tr.querySelector("input");
    checkbox.addEventListener("change", () =>
      updateWeek(w.id, checkbox.checked)
    );

    bodyEl.appendChild(tr);
  });
}

/* =========================
   UPDATE
========================= */
async function updateWeek(id, behaald) {
  const { error } = await supabase
    .from("prognose_weken")
    .update({ behaald })
    .eq("id", id);

  if (error) {
    console.error("Fout bij opslaan prognose:", error);
    alert("Opslaan mislukt");
  }
}

/* =========================
   INIT
========================= */
laadPrognose();