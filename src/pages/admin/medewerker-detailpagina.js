import { supabase } from "../../services/supabase.js";

/* ===============================
   HULPFUNCTIES
================================ */

function getMedewerkerId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function berekenLeeftijd(geboortedatum) {
  if (!geboortedatum) return "Niet ingesteld";

  const birth = new Date(geboortedatum);
  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return `${age} jaar`;
}

/* ===============================
   NETTO GEMIDDELDE
================================ */
async function berekenNettoGemiddelde(medewerkerId) {

  // 🔹 Netto orders ophalen
  const { data: orders, error } = await supabase
    .from("dag_invoer")
    .select("status, datum")
    .eq("employee_id", medewerkerId);

  if (error) {
    console.error("❌ Fout bij laden dag_invoer:", error);
    return null;
  }

  if (!orders || orders.length === 0) return null;

  const nettoOrders = orders.filter(o => o.status === "Netto").length;

  // 🔹 Gewerkte dagen ophalen uit planning (voor halve dagen)
  const { data: planning, error: planningError } = await supabase
    .from("planning")
    .select("year, week_number, day_of_week, half_day")
    .eq("employee_id", medewerkerId);

  if (planningError) {
    console.error("❌ Fout bij laden planning:", planningError);
    return null;
  }

  if (!planning || planning.length === 0) return null;

  // 🔹 Alleen dagen tellen waarop daadwerkelijk orders zijn ingevoerd
  const gewerkteDatums = new Set(orders.map(o => o.datum));

  let totaalDagen = 0;

  planning.forEach(p => {
    // Hier koppelen we planning aan ingevoerde dag
    // We moeten week+dag omzetten naar echte datum
    // Simpelste manier: check of er orders op die dag bestaan

    // Als er een order bestaat op die datum → dag telt mee
    // Omdat dag_invoer leidend is voor gewerkte dagen

    gewerkteDatums.forEach(datum => {
      const date = new Date(datum);
      const week = getWeekNumber(date);
      const year = date.getFullYear();
      const day = date.getDay() === 0 ? 7 : date.getDay();

      if (
        p.year === year &&
        p.week_number === week &&
        p.day_of_week === day
      ) {
        totaalDagen += p.half_day ? 0.5 : 1;
      }
    });
  });

  if (totaalDagen === 0) return null;

  return nettoOrders / totaalDagen;
}

/* Helper voor weeknummer */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/* ===============================
   SPW (Correcte versie)
   geplande dagen / unieke weken
================================ */
async function berekenSPW(medewerkerId) {

  const { data, error } = await supabase
    .from("planning")
    .select("year, week_number, half_day")
    .eq("employee_id", medewerkerId);

  if (error) {
    console.error("❌ Fout bij laden planning voor SPW:", error);
    return null;
  }

  if (!data || data.length === 0) return null;

  // 🔹 Unieke weken bepalen
  const uniekeWeken = new Set(
    data.map(d => `${d.year}-${d.week_number}`)
  );

  const weekArray = Array.from(uniekeWeken)
    .map(w => {
      const [year, week] = w.split("-");
      return { year: Number(year), week: Number(week) };
    })
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.week - b.week;
    });

  const eerste = weekArray[0];
  const laatste = weekArray[weekArray.length - 1];

  // 🔥 TOTAAL AANTAL WEKEN (inclusief lege weken)
  let totaalWeken;

  if (eerste.year === laatste.year) {
    totaalWeken = laatste.week - eerste.week + 1;
  } else {
    // Jaarovergang (veilig)
    totaalWeken = (52 - eerste.week + 1) + laatste.week;
  }

  // 🔥 TOTAAL GEWERKTE DAGEN (halve dagen tellen mee als 0.5)
  let totaalDagen = 0;

  data.forEach(d => {
    totaalDagen += d.half_day ? 0.5 : 1;
  });

  if (totaalWeken === 0) return null;

  const spw = totaalDagen / totaalWeken;

  return spw;
}

/* ===============================
   DATA LADEN
================================ */
async function laadMedewerker() {

  const medewerkerId = getMedewerkerId();
  if (!medewerkerId) {
    alert("Geen medewerker ID gevonden");
    return;
  }

  const { data: medewerker, error } = await supabase
    .from("medewerkers")
    .select("*")
    .eq("id", medewerkerId)
    .maybeSingle();

  if (error || !medewerker) {
    console.error("❌ Fout bij laden medewerker:", error);
    alert("Medewerker kon niet worden geladen");
    return;
  }

  const nettoGemiddelde = await berekenNettoGemiddelde(medewerkerId);
  const spw = await berekenSPW(medewerkerId);

  renderMedewerker(medewerker, nettoGemiddelde, spw);
}

/* ===============================
   RENDER
================================ */
function renderMedewerker(m, nettoGemiddelde, spw) {

  document.getElementById("medewerkerNaam").innerText =
    `${m.naam}${m.actief ? "" : " (Inactief)"}`;

  document.getElementById("medewerkerLeeftijd").innerText =
    berekenLeeftijd(m.geboortedatum);

  document.getElementById("medewerkerFunctie").innerText =
    m.functie || "Niet ingesteld";

  document.getElementById("medewerkerStatus").innerText =
    m.actief ? "Actief" : "Inactief";

  document.getElementById("nettoGemiddelde").innerText =
    nettoGemiddelde != null
      ? nettoGemiddelde.toFixed(2)
      : "–";

  document.getElementById("spw").innerText =
    spw != null
      ? spw.toFixed(2)
      : "–";
}

/* ===============================
   ACTIES
================================ */
document.getElementById("terugBtn")?.addEventListener("click", () => {
  window.location.href = "/src/pages/admin/medewerkers.html";
});

/* ===============================
   INIT
================================ */
laadMedewerker();