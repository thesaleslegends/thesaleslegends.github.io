import requireAuth from "../../utils/guards.js";
import { supabase } from "../../services/supabase.js";

console.log("🔥 ADMIN dashboard.js actief");

document.addEventListener("DOMContentLoaded", async () => {

  await requireAuth();
  console.log("✅ Backend dashboard geladen");

  const periodeSelect = document.getElementById("dashboardPeriode");

  /* =========================
     🧠 DATUM HELPERS
  ========================= */

  function startVanPeriode(type) {
    const now = new Date();

    if (type === "dag")
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (type === "week") {
      const d = now.getDay() || 7;
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - d + 1);
    }

    if (type === "maand")
      return new Date(now.getFullYear(), now.getMonth(), 1);

    if (type === "jaar")
      return new Date(now.getFullYear(), 0, 1);

    return null;
  }

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

    if (periode === "maand")
      return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

    if (periode === "jaar")
      return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);

    return null;
  }

  function datumInPeriode(datum, start, eind) {
    if (!datum) return false;
    const d = new Date(datum);
    if (start && d < start) return false;
    if (eind && d > eind) return false;
    return true;
  }

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
    if (leeftijd <= 16) return 8;
    if (leeftijd === 17) return 8.5;
    if (leeftijd === 18) return 10;
    return 12;
  }

  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  async function laadDashboard() {

    if (!periodeSelect) return;

    const periode = periodeSelect.value;
    const start = startVanPeriode(periode);
    const eind = eindVanPeriode(start, periode);

    const { data: alleMedewerkers } = await supabase
      .from("medewerkers")
      .select("*");

    const { data: planning } = await supabase
      .from("planning")
      .select("datum, half_day, year, week_number, employee_id");

    const { data: invoer } = await supabase
      .from("dag_invoer")
      .select("status, datum, employee_id");

    const actieveMedewerkers = (alleMedewerkers ?? []).filter(m =>
      m.actief === true ||
      m.actief === "Actief" ||
      m.status === "Actief" ||
      m.is_actief === true
    );

    const aantalActieve = actieveMedewerkers.length;

    const planningInPeriode = (planning ?? []).filter(p =>
      datumInPeriode(p.datum, start, eind)
    );

    let shifts = 0;
    planningInPeriode.forEach(p => {
      shifts += p.half_day ? 0.5 : 1;
    });

    const nettoOrders = (invoer ?? []).filter(i =>
      i.status === "Netto" &&
      datumInPeriode(i.datum, start, eind)
    ).length;

    const brutoOrders = (invoer ?? []).filter(i =>
      datumInPeriode(i.datum, start, eind)
    ).length;

    const afvalPercentage =
      brutoOrders > 0
        ? (((brutoOrders - nettoOrders) / brutoOrders) * 100).toFixed(1)
        : "0.0";

    let spw = "0.00";

    if (periode === "week") {
      spw = aantalActieve > 0
        ? (shifts / aantalActieve).toFixed(2)
        : "0.00";
    } else {
      const uniekeWeken = new Set(
        planningInPeriode.map(p => `${p.year}-${p.week_number}`)
      );
      const aantalWeken = uniekeWeken.size;

      if (aantalWeken > 0 && aantalActieve > 0) {
        spw = (
          shifts / aantalWeken / aantalActieve
        ).toFixed(2);
      }
    }

    const brutoGem = shifts > 0
      ? (brutoOrders / shifts).toFixed(2)
      : "0.00";

    const nettoGem = shifts > 0
      ? (nettoOrders / shifts).toFixed(2)
      : "0.00";

    const OMZET_PER_NETTO = 50;
    const BONUS_PER_NETTO = 10;
    const UREN_HALF = 3;
    const UREN_HEEL = 6;

    const omzet = nettoOrders * OMZET_PER_NETTO;

    let totaleLoonKosten = 0;

    actieveMedewerkers.forEach(m => {

      const leeftijd = berekenLeeftijd(m.geboortedatum);
      const uurloon = bepaalUurloon(leeftijd);

      const gewerkteUren = planningInPeriode
        .filter(p => p.employee_id === m.id)
        .reduce((t, p) => t + (p.half_day ? UREN_HALF : UREN_HEEL), 0);

      const medewerkerNetto = (invoer ?? [])
        .filter(i =>
          i.employee_id === m.id &&
          i.status === "Netto" &&
          datumInPeriode(i.datum, start, eind)
        ).length;

      const loonExcl = (gewerkteUren * uurloon) + (medewerkerNetto * BONUS_PER_NETTO);
      const loonIncl = loonExcl * 1.2;

      totaleLoonKosten += loonIncl;
    });

    const kosten = totaleLoonKosten;
    const winst = omzet - kosten;

    set("kpiActief", aantalActieve);
    set("kpiSPW", spw);
    set("kpiShifts", shifts.toFixed(1));

    set("kpiBruto", brutoOrders);
    set("kpiNetto", nettoOrders);
    set("kpiBrutoGem", brutoGem);
    set("kpiNettoGem", nettoGem);
    set("kpiAfval", `${afvalPercentage}%`);

    set("kpiOmzet", `€ ${omzet.toFixed(2)}`);
    set("kpiKosten", `€ ${kosten.toFixed(2)}`);
    set("kpiWinst", `€ ${winst.toFixed(2)}`);
  }

  periodeSelect?.addEventListener("change", laadDashboard);
  laadDashboard();

  /* =========================
     🔗 NAVIGATIE (HERSTELD)
  ========================= */

  document.getElementById("medewerkers")?.addEventListener("click", () => {
    window.location.href = "./medewerkers.html";
  });

  document.getElementById("daginvoer")?.addEventListener("click", () => {
    window.location.href = "./daginvoer.html";
  });

  document.getElementById("planning")?.addEventListener("click", () => {
    window.location.href = "./planning.html";
  });

  document.getElementById("leaderboard")?.addEventListener("click", () => {
    window.location.href = "./leaderboard.html";
  });

  document.getElementById("financieel")?.addEventListener("click", () => {
    window.location.href = "./finance.html";
  });

  document.getElementById("logout")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "/index.html";
  });

});