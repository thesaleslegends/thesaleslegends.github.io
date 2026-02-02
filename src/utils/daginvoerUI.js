export function maakRegel(container, data = {}) {
  const row = document.createElement("div");
  row.className = "row";

  row.innerHTML = `
    <select class="medewerker">
      <option value="">Selecteer medewerker</option>
      <option value="emp_001">Damian</option>
      <option value="emp_002">Tim</option>
      <option value="emp_003">Jade</option>
      <option value="emp_004">Ricardo</option>
      <option value="emp_005">San</option>
      <option value="emp_006">Joya</option>
      <option value="emp_007">Kees</option>
      <option value="emp_008">Amber</option>
      <option value="emp_009">Imah</option>
    </select>

    <label>
      <input type="checkbox" class="halveShift"> ½ dag
    </label>

    <input class="klant" placeholder="Klant">
    <button class="statusBtn" type="button">Netto</button>
    <input class="opmerking" placeholder="Opmerking">
  `;

  if (data.medewerkerId) row.querySelector(".medewerker").value = data.medewerkerId;
  if (data.shiftWeight === 0.5) row.querySelector(".halveShift").checked = true;
  if (data.klant) row.querySelector(".klant").value = data.klant;
  if (data.opmerking) row.querySelector(".opmerking").value = data.opmerking;
  if (data.status) row.querySelector(".statusBtn").textContent = data.status;

  const statussen = ["Netto", "Bruto", "Voicemail"];
  let i = statussen.indexOf(row.querySelector(".statusBtn").textContent);

  row.querySelector(".statusBtn").onclick = () => {
    i = (i + 1) % statussen.length;
    row.querySelector(".statusBtn").textContent = statussen[i];
  };

  container.appendChild(row);
}

export function verzamelRegels() {
  const regels = [];

  document.querySelectorAll(".row").forEach(row => {
    const medewerkerId = row.querySelector(".medewerker").value;
    if (!medewerkerId) return;

    regels.push({
      medewerkerId,
      klant: row.querySelector(".klant").value,
      status: row.querySelector(".statusBtn").textContent,
      opmerking: row.querySelector(".opmerking").value,
      shiftWeight: row.querySelector(".halveShift").checked ? 0.5 : 1
    });
  });

  return regels;
}