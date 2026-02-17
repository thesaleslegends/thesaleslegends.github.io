import { supabase } from "../../services/supabase.js";

/* =========================
   DOM
========================= */
const bodyEl = document.getElementById("offertesBody");
const btnAdd = document.getElementById("addOfferte");

/* =========================
   STATE
========================= */
let medewerkers = [];
let offertes = [];

/* =========================
   DATA LADEN
========================= */
async function laadData() {
  const { data: medewerkersData, error: mErr } = await supabase
    .from("medewerkers")
    .select("id, naam")
    .order("naam");

  if (mErr) {
    console.error("Fout medewerkers:", mErr);
    return;
  }

  medewerkers = medewerkersData ?? [];

  const { data: offertesData, error: oErr } = await supabase
    .from("getekende_offertes")
    .select("id, medewerker_id, klant, offerte_waarde, datum")
    .order("datum", { ascending: false });

  if (oErr) {
    console.error("Fout offertes:", oErr);
    return;
  }

  offertes = offertesData ?? [];
  render();
}

/* =========================
   RENDER
========================= */
function render() {
  bodyEl.innerHTML = "";

  offertes.forEach(o => {
    bodyEl.appendChild(maakRij(o));
  });
}

/* =========================
   RIJ MAKEN
========================= */
function maakRij(offerte = {}) {
  const tr = document.createElement("tr");

  const medewerkerOptions = medewerkers
    .map(
      m =>
        `<option value="${m.id}" ${
          m.id === offerte.medewerker_id ? "selected" : ""
        }>${m.naam}</option>`
    )
    .join("");

  tr.innerHTML = `
    <td>
      <select class="medewerkerSelect">
        <option value="">Selecteer</option>
        ${medewerkerOptions}
      </select>
    </td>

    <td>
      <input
        type="text"
        placeholder="Klantnaam"
        value="${offerte.klant ?? ""}"
      />
    </td>

    <td style="text-align:right;">
      <input
        type="number"
        step="0.01"
        placeholder="0.00"
        value="${offerte.offerte_waarde ?? ""}"
        style="width:120px; text-align:right;"
      />
    </td>

    <td>
      <input
        type="date"
        value="${offerte.datum ?? ""}"
      />
    </td>

    <td style="text-align:center;">
      <button class="secondary delete">🗑️</button>
    </td>
  `;

  const select = tr.querySelector("select");
  const klantInput = tr.querySelectorAll("input")[0];
  const waardeInput = tr.querySelectorAll("input")[1];
  const datumInput = tr.querySelectorAll("input")[2];
  const deleteBtn = tr.querySelector(".delete");

  async function opslaan() {
    if (
      !select.value ||
      !klantInput.value ||
      !waardeInput.value ||
      !datumInput.value
    ) {
      return;
    }

    const payload = {
      medewerker_id: select.value,
      klant: klantInput.value,
      offerte_waarde: Number(waardeInput.value),
      datum: datumInput.value,
    };

    if (offerte.id) {
      await supabase
        .from("getekende_offertes")
        .update(payload)
        .eq("id", offerte.id);
    } else {
      const { data } = await supabase
        .from("getekende_offertes")
        .insert(payload)
        .select()
        .single();

      offerte.id = data.id;
      offerte.offerte_waarde = payload.offerte_waarde;
      offertes.push(offerte);
    }
  }

  select.onchange = opslaan;
  klantInput.onblur = opslaan;
  waardeInput.onblur = opslaan;
  datumInput.onchange = opslaan;

  deleteBtn.onclick = async () => {
    if (offerte.id) {
      await supabase
        .from("getekende_offertes")
        .delete()
        .eq("id", offerte.id);
    }
    tr.remove();
  };

  return tr;
}

/* =========================
   EVENTS
========================= */
btnAdd.onclick = () => {
  bodyEl.appendChild(maakRij({}));
};

/* =========================
   INIT
========================= */
laadData();