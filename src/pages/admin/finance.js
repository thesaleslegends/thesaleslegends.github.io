import { supabase } from "../../services/supabase.js";

/* =========================
   CONSTANTEN
========================= */
const OMZET_PER_NETTO = 50;
const BONUS_PER_NETTO = 10;
const COMMISSIE_PERCENTAGE = 0.02;
const UREN_HALF = 3;
const UREN_HEEL = 6;

/* =========================
   DOM
========================= */
const bodyEl = document.getElementById("financeBody");
const btnTeam = document.getElementById("btnTeam");
const btnMedewerker = document.getElementById("btnMedewerker");
const medewerkerSelect = document.getElementById("medewerkerSelect");

const btnFilter = document.getElementById("btnFilter");
const filterDropdown = document.getElementById("filterDropdown");

const filterPrognose = document.getElementById("filterPrognose");
const filterVasteLasten = document.getElementById("filterVasteLasten");
const filterOffertes = document.getElementById("filterOffertes");
const filterVariabeleKosten = document.getElementById("filterVariabeleKosten");

const periodeSelect = document.getElementById("periodeSelect");
const startDatumInput = document.getElementById("startDatum");
const eindDatumInput = document.getElementById("eindDatum");

/* =========================
   STATE
========================= */
let viewMode = "team";
let medewerkers = [];
let totaleVasteLasten = 0;
let totaleVariabeleKosten = 0;
let prognoseWeken = new Set();

/* =========================
   HULPFUNCTIES
========================= */
function berekenLeeftijd(datum) {
  if (!datum) return 0;
  const birth = new Date(datum);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function bepaalUurloon(leeftijd) {
  if (leeftijd === 14) return 8;
  if (leeftijd === 15) return 8;
  if (leeftijd === 16) return 8;
  if (leeftijd === 17) return 8.5;
  if (leeftijd >= 18) return 10;

  return 0; // fallback voor jonger dan 14
}

function heeftGewerkt(m) {
  return m.gewerkteUren > 0 || m.nettoOrders > 0 || m.commissie > 0;
}

function weekVanDatum(datum) {
  const d = new Date(datum);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function startVanPeriode(type) {
  const now = new Date();
  if (type === "dag") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (type === "week") {
    const d = now.getDay() || 7;
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - d + 1);
  }
  if (type === "maand") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (type === "jaar") return new Date(now.getFullYear(), 0, 1);
  return null;
}

/* 🔧 TOEGEVOEGD – kalenderdag check (GEEN bestaande code vervangen) */
function zelfdeDag(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/* 🔧 TOEGEVOEGD – verder niets aangepast */
function eindVanPeriode(start, periode) {
  if (!start) return null;
  const d = new Date(start);

  if (periode === "dag") {
    d.setHours(23, 59, 59, 999);
    return d;
  }

  if (periode === "week") {
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  if (periode === "maand") {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  if (periode === "jaar") {
    return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
  }

  return null;
}

function datumInPeriode(datum, start, eind) {
  if (!datum) return false;
  const d = new Date(datum);
  if (start && d < start) return false;
  if (eind && d > eind) return false;
  return true;
}

function vasteLastenVoorPeriode(perJaar, periode, start, eind) {
  if (periode === "dag") return perJaar / 365;
  if (periode === "week") return perJaar / 52;
  if (periode === "maand") return perJaar / 12;
  if (periode === "jaar") return perJaar;

  if (periode === "custom" && start && eind) {
    const dagen =
      Math.ceil((new Date(eind) - new Date(start)) / 86400000) + 1;
    return (perJaar / 365) * dagen;
  }

  return perJaar / 52;
}

/* =========================
   DATA LADEN
========================= */
async function laadData() {
  const periode = periodeSelect.value;

  let start = null;
  let eind = null;

  if (periode === "custom") {
    start = startDatumInput.value ? new Date(startDatumInput.value) : null;
    eind = eindDatumInput.value ? new Date(eindDatumInput.value) : null;
  } else {
    start = startVanPeriode(periode);
    eind = eindVanPeriode(start, periode);
  }

  const { data: medewerkersData } = await supabase
    .from("medewerkers")
    .select("id, naam, geboortedatum");

  const { data: invoerData } = await supabase
    .from("dag_invoer")
    .select("employee_id, status, datum");

  const { data: planningData } = await supabase
    .from("planning")
    .select("employee_id, half_day, datum");

  const { data: vasteLastenData } = await supabase
    .from("vaste_lasten")
    .select("bedrag_per_jaar");

  const { data: offertesData } = await supabase
    .from("getekende_offertes")
    .select("medewerker_id, offerte_waarde, datum");

  const { data: variabeleKostenData } = await supabase
    .from("variabele_kosten")
    .select("bedrag, datum");

  const { data: prognoseData } = await supabase
    .from("prognose_weken")
    .select("week")
    .eq("behaald", true);

  prognoseWeken = new Set((prognoseData ?? []).map(p => p.week));

  const vastePerJaar = (vasteLastenData ?? []).reduce(
    (t, v) => t + Number(v.bedrag_per_jaar),
    0
  );

  totaleVasteLasten = vasteLastenVoorPeriode(
    vastePerJaar,
    periode,
    start,
    eind
  );

  totaleVariabeleKosten = (variabeleKostenData ?? [])
    .filter(v => datumInPeriode(v.datum, start, eind))
    .reduce((t, v) => t + Number(v.bedrag), 0);

  medewerkers = (medewerkersData ?? []).map(m => {
    const nettoOrders = (invoerData ?? []).filter(d =>
      d.employee_id === m.id &&
      d.status === "Netto" &&
      (
        periode === "dag"
          ? zelfdeDag(new Date(d.datum), start)
          : datumInPeriode(d.datum, start, eind)
      )
    ).length;

    const prognoseOrders = (invoerData ?? []).filter(d =>
      d.employee_id === m.id &&
      d.status === "Netto" &&
      datumInPeriode(d.datum, start, eind) &&
      prognoseWeken.has(weekVanDatum(d.datum))
    ).length;

    const gewerkteUren = (planningData ?? [])
      .filter(p =>
        p.employee_id === m.id &&
        datumInPeriode(p.datum, start, eind)
      )
      .reduce((t, p) => t + (p.half_day ? UREN_HALF : UREN_HEEL), 0);

    const offerteSom = (offertesData ?? [])
      .filter(o =>
        o.medewerker_id === m.id &&
        datumInPeriode(o.datum, start, eind)
      )
      .reduce((t, o) => t + Number(o.offerte_waarde), 0);

    return {
      ...m,
      nettoOrders,
      prognoseOrders,
      gewerkteUren,
      commissie: offerteSom * COMMISSIE_PERCENTAGE
    };
  });

  vulSelect();
  render();
}

/* =========================
   SELECT
========================= */
function vulSelect() {
  medewerkerSelect.innerHTML = "";
  medewerkers.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.naam;
    medewerkerSelect.appendChild(opt);
  });
}

/* =========================
   RENDER
========================= */
function render() {
  bodyEl.innerHTML = "";

  const lijst =
    viewMode === "team"
      ? medewerkers.filter(heeftGewerkt)
      : medewerkers.filter(m => m.id === medewerkerSelect.value);

  const actieve = medewerkers.filter(heeftGewerkt).length || 1;

  const vastePM = totaleVasteLasten / actieve;
  const variabelPM = totaleVariabeleKosten / actieve;

  let totaal = {
    omzet: 0, prognose: 0, offertes: 0,
    loonExcl: 0, loonIncl: 0,
    vaste: 0, variabel: 0, netto: 0
  };

  lijst.forEach(m => {
    const uurloon = bepaalUurloon(berekenLeeftijd(m.geboortedatum));

    const omzet = m.nettoOrders * OMZET_PER_NETTO;
    const prognose = filterPrognose.checked
      ? m.prognoseOrders * BONUS_PER_NETTO
      : 0;

    const commissie = filterOffertes.checked ? m.commissie : 0;
    const vaste = filterVasteLasten.checked ? vastePM : 0;
    const variabel = filterVariabeleKosten.checked ? variabelPM : 0;

    const loonExcl = (m.gewerkteUren * uurloon) + (m.nettoOrders * BONUS_PER_NETTO);
    const loonIncl = loonExcl * 1.2;

    const netto = omzet + prognose + commissie - loonIncl - vaste - variabel;

    totaal.omzet += omzet;
    totaal.prognose += prognose;
    totaal.offertes += commissie;
    totaal.loonExcl += loonExcl;
    totaal.loonIncl += loonIncl;
    totaal.vaste += vaste;
    totaal.variabel += variabel;
    totaal.netto += netto;

    bodyEl.innerHTML += `
      <tr>
        <td>${m.naam}</td>
        <td style="text-align:right;">€ ${omzet.toFixed(2)}</td>
        <td style="text-align:right;">€ ${prognose.toFixed(2)}</td>
        <td style="text-align:right;">€ ${commissie.toFixed(2)}</td>
        <td style="text-align:right;">€ ${loonExcl.toFixed(2)}</td>
        <td style="text-align:right;">€ ${loonIncl.toFixed(2)}</td>
        <td style="text-align:right;">€ ${vaste.toFixed(2)}</td>
        <td style="text-align:right;">€ ${variabel.toFixed(2)}</td>
        <td style="text-align:right;">€ ${netto.toFixed(2)}</td>
      </tr>
    `;
  });

  bodyEl.innerHTML += `
    <tr style="font-weight:700;border-top:2px solid #ddd;background:#fafafa;">
      <td>Totaal</td>
      <td style="text-align:right;">€ ${totaal.omzet.toFixed(2)}</td>
      <td style="text-align:right;">€ ${totaal.prognose.toFixed(2)}</td>
      <td style="text-align:right;">€ ${totaal.offertes.toFixed(2)}</td>
      <td style="text-align:right;">€ ${totaal.loonExcl.toFixed(2)}</td>
      <td style="text-align:right;">€ ${totaal.loonIncl.toFixed(2)}</td>
      <td style="text-align:right;">€ ${totaal.vaste.toFixed(2)}</td>
      <td style="text-align:right;">€ ${totaal.variabel.toFixed(2)}</td>
      <td style="text-align:right;">€ ${totaal.netto.toFixed(2)}</td>
    </tr>
  `;
}

/* =========================
   EVENTS & INIT
========================= */
btnTeam.onclick = () => {
  viewMode = "team";
  medewerkerSelect.style.display = "none";
  render();
};

btnMedewerker.onclick = () => {
  viewMode = "medewerker";
  medewerkerSelect.style.display = "inline-block";
  render();
};

medewerkerSelect.onchange = render;

filterPrognose.onchange = render;
filterVasteLasten.onchange = render;
filterOffertes.onchange = render;
filterVariabeleKosten.onchange = render;

periodeSelect.onchange = () => {
  const custom = periodeSelect.value === "custom";
  startDatumInput.style.display = custom ? "inline-block" : "none";
  eindDatumInput.style.display = custom ? "inline-block" : "none";
  laadData();
};

startDatumInput.onchange = laadData;
eindDatumInput.onchange = laadData;

btnFilter.onclick = () => {
  filterDropdown.style.display =
    filterDropdown.style.display === "none" ? "block" : "none";
};

laadData();