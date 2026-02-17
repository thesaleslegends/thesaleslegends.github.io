import { supabase } from "../../services/supabase.js";

console.log("JS GELADEN ✅");

/* =========================
   DOM
========================= */
const bodyEl = document.getElementById("variabeleKostenBody");
const btnAdd = document.getElementById("btnAddRow");

/* =========================
   RIJ MAKEN
========================= */
function maakRij(data = {}) {
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td>
      <input type="number" step="0.01" placeholder="0.00" value="${data.bedrag ?? ""}">
    </td>
    <td>
      <input type="text" placeholder="Omschrijving" value="${data.omschrijving ?? ""}">
    </td>
    <td>
      <input type="date" value="${data.datum ?? ""}">
    </td>
    <td>
      <button class="delete">🗑️</button>
    </td>
  `;

  const bedragInput = tr.querySelectorAll("input")[0];
  const omschrijvingInput = tr.querySelectorAll("input")[1];
  const datumInput = tr.querySelectorAll("input")[2];
  const deleteBtn = tr.querySelector(".delete");

  let id = data.id ?? null;

  /* =========================
     OPSLAAN
  ========================= */
  async function opslaan() {
    if (!bedragInput.value || !datumInput.value) return;

    const payload = {
      bedrag: Number(bedragInput.value),
      omschrijving: omschrijvingInput.value,
      datum: datumInput.value
    };

    console.log("OPSLAAN →", payload);

    if (id) {
      await supabase
        .from("variabele_kosten")
        .update(payload)
        .eq("id", id);
    } else {
      const { data: inserted, error } = await supabase
        .from("variabele_kosten")
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error("Supabase fout:", error);
        return;
      }

      id = inserted.id;
    }
  }

  bedragInput.onblur = opslaan;
  omschrijvingInput.onblur = opslaan;
  datumInput.onchange = opslaan;

  /* =========================
     DELETE
  ========================= */
  deleteBtn.onclick = async () => {
    if (id) {
      await supabase
        .from("variabele_kosten")
        .delete()
        .eq("id", id);
    }
    tr.remove();
  };

  return tr;
}

/* =========================
   DATA LADEN
========================= */
async function laadData() {
  const { data, error } = await supabase
    .from("variabele_kosten")
    .select("*")
    .order("datum", { ascending: false });

  if (error) {
    console.error("Fout laden:", error);
    return;
  }

  bodyEl.innerHTML = "";
  data.forEach(rij => bodyEl.appendChild(maakRij(rij)));
}

/* =========================
   EVENTS
========================= */
btnAdd.addEventListener("click", () => {
  console.log("KNOP GEKLIKT ✅");
  bodyEl.appendChild(maakRij());
});

/* =========================
   INIT
========================= */
laadData();