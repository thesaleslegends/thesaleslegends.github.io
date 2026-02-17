import { supabase } from "../../services/supabase.js";

/* =========================
   DOM
========================= */
const bodyEl = document.getElementById("vasteLastenBody");
const btnAddRow = document.getElementById("btnAddRow");
const btnSave = document.getElementById("btnSave");

/* =========================
   DATA LADEN
========================= */
async function laadVasteLasten() {
  const { data, error } = await supabase
    .from("vaste_lasten")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Fout bij laden vaste lasten:", error);
    return;
  }

  bodyEl.innerHTML = "";
  data.forEach(addRow);
}

/* =========================
   RIJ TOEVOEGEN (UI)
========================= */
function addRow(item = {}) {
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td>
      <input
        type="text"
        value="${item.omschrijving ?? ""}"
        placeholder="Bijv. Auto kosten"
        class="omschrijving"
      />
    </td>

    <td>
      <input
        type="number"
        value="${item.bedrag_per_jaar ?? ""}"
        placeholder="0"
        class="bedrag"
      />
    </td>

    <td>
      <button class="secondary delete">🗑</button>
    </td>
  `;

  tr.dataset.id = item.id ?? "";

  tr.querySelector(".delete").onclick = async () => {
    if (!tr.dataset.id) {
      tr.remove();
      return;
    }

    await supabase
      .from("vaste_lasten")
      .delete()
      .eq("id", tr.dataset.id);

    tr.remove();
  };

  bodyEl.appendChild(tr);
}

/* =========================
   OPSLAAN
========================= */
async function opslaan() {
  const rows = [...bodyEl.querySelectorAll("tr")];

  for (const row of rows) {
    const omschrijving = row.querySelector(".omschrijving").value.trim();
    const bedrag = Number(row.querySelector(".bedrag").value);

    if (!omschrijving || !bedrag) continue;

    if (row.dataset.id) {
      // UPDATE
      await supabase
        .from("vaste_lasten")
        .update({
          omschrijving,
          bedrag_per_jaar: bedrag
        })
        .eq("id", row.dataset.id);
    } else {
      // INSERT
      const { data } = await supabase
        .from("vaste_lasten")
        .insert({
          omschrijving,
          bedrag_per_jaar: bedrag
        })
        .select()
        .single();

      row.dataset.id = data.id;
    }
  }

  window.location.href = "/src/pages/admin/finance.html";
}

/* =========================
   EVENTS
========================= */
btnAddRow.onclick = () => addRow();
btnSave.onclick = opslaan;

/* =========================
   INIT
========================= */
laadVasteLasten();