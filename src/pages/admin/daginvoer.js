import { supabase } from "../../services/supabase.js";
import { maakRegel, verzamelRegels } from "../../utils/daginvoerUI.js";
import { requireAuth } from "../../utils/guards.js";

await requireAuth();

const datumInput = document.getElementById("dagDatum");
const regelsContainer = document.getElementById("regels");
const addRowBtn = document.getElementById("addRow");
const opslaanBtn = document.getElementById("opslaanDag");

document.addEventListener("DOMContentLoaded", async () => {
  const vandaag = new Date().toISOString().split("T")[0];
  datumInput.value = vandaag;
  await laadDag(vandaag);

  datumInput.onchange = () => laadDag(datumInput.value);
  addRowBtn.onclick = () => maakRegel(regelsContainer);
  opslaanBtn.onclick = opslaanDag;
});

async function laadDag(datum) {
  regelsContainer.innerHTML = "";

  const { data } = await supabase
    .from("dagen")
    .select("regels")
    .eq("datum", datum)
    .single();

  if (!data?.regels?.length) {
    maakRegel(regelsContainer);
  } else {
    data.regels.forEach(r => maakRegel(regelsContainer, r));
  }
}

async function opslaanDag() {
  const regels = verzamelRegels();
  if (!regels.length) return alert("Geen regels ingevuld");

  const { error } = await supabase.from("dagen").upsert({
    datum: datumInput.value,
    regels
  });

  if (error) {
    console.error(error);
    alert("Opslaan mislukt");
  } else {
    alert("✅ Dag opgeslagen");
  }
}