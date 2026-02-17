import { supabase } from "../../services/supabase.js";

/* =========================
   DOM ELEMENTEN
========================= */
const container = document.getElementById("medewerkersLijst");
const inactiveSelect = document.getElementById("inactiveSelect");
const activateBtn = document.getElementById("activateBtn");

const openAddModalBtn = document.getElementById("openAddModal");
const modal = document.getElementById("addMedewerkerModal");
const cancelAddBtn = document.getElementById("cancelAdd");
const saveAddBtn = document.getElementById("saveAdd");

const naamInput = document.getElementById("nieuweNaam");
const geboorteInput = document.getElementById("nieuweGeboortedatum");

/* =========================
   MEDEWERKERS LADEN
========================= */
async function laadMedewerkers() {
  const { data, error } = await supabase
    .from("medewerkers")
    .select("id, naam, actief")
    .order("naam");

  if (error) {
    console.error("Fout bij laden medewerkers", error);
    return;
  }

  container.innerHTML = "";
  inactiveSelect.innerHTML = `<option value="">Selecteer medewerker</option>`;

  data.forEach(m => {
    if (m.actief) {
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `<span>${m.naam}</span><span>Actief</span>`;

      row.onclick = () => {
        window.location.href =
          `/src/pages/admin/medewerker-detailpagina.html?id=${m.id}`;
      };

      container.appendChild(row);
    } else {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.naam;
      inactiveSelect.appendChild(opt);
    }
  });
}

/* =========================
   INACTIEF → ACTIEF
========================= */
activateBtn.onclick = async () => {
  const id = inactiveSelect.value;
  if (!id) return;

  await supabase
    .from("medewerkers")
    .update({ actief: true })
    .eq("id", id);

  inactiveSelect.value = "";
  laadMedewerkers();
};

/* =========================
   MODAL OPEN / SLUIT
========================= */
openAddModalBtn.onclick = () => {
  modal.classList.remove("hidden");
};

cancelAddBtn.onclick = () => {
  modal.classList.add("hidden");
  naamInput.value = "";
  geboorteInput.value = "";
};

/* =========================
   NIEUWE MEDEWERKER OPSLAAN
========================= */
saveAddBtn.onclick = async () => {
  const naam = naamInput.value.trim();
  const geboortedatum = geboorteInput.value;

  if (!naam || !geboortedatum) {
    alert("Vul naam en geboortedatum in");
    return;
  }

  const { error } = await supabase
    .from("medewerkers")
    .insert({
      naam,
      geboortedatum,
      functie: "sales starter",
      actief: true
    });

  if (error) {
    console.error(error);
    alert("Fout bij toevoegen medewerker");
    return;
  }

  modal.classList.add("hidden");
  naamInput.value = "";
  geboorteInput.value = "";

  laadMedewerkers();
};

/* =========================
   INIT
========================= */
laadMedewerkers();