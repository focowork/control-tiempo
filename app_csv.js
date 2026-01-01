import {
  newClient,
  changeActivity,
  changeClient,
  closeClient,
  getCurrentState
} from "./timeEngine.js";

document.addEventListener("DOMContentLoaded", () => {

  const ACTIVITY_LABELS = {
    trabajo: "Trabajo",
    telefono: "Teléfono",
    cliente: "Cliente",
    estudio: "Visitando",
    otros: "Otros"
  };

  function getWorkerName() {
    let name = localStorage.getItem("focowork_worker_name");
    if (!name) {
      name = prompt("Nombre del trabajador:");
      if (!name) name = "trabajador";
      localStorage.setItem("focowork_worker_name", name.trim());
    }
    return name.trim();
  }

  function safeName(str) {
    return str.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  }

  const WORKER_NAME = getWorkerName();

  const clientNameEl = document.getElementById("clientName");
  const activityNameEl = document.getElementById("activityName");
  const timerEl = document.getElementById("timer");
  const activityButtons = document.querySelectorAll(".activity");

  const focusBtn = document.getElementById("focusBtn");
  const todayBtn = document.getElementById("todayBtn");

  const infoPanel = document.getElementById("infoPanel");
  const infoText = document.getElementById("infoText");

  let timerInterval = null;
  const FOCUS_WINDOW_MS = 90 * 60 * 1000;

  function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const h = String(Math.floor(s / 3600)).padStart(2, "0");
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${h}:${m}:${sec}`;
  }

  function calculateClientTotal(clientId) {
    const { blocks } = getCurrentState();
    const now = Date.now();
    let total = 0;

    blocks.forEach(b => {
      if (b.cliente_id === clientId) {
        total += (b.fin ?? now) - b.inicio;
      }
    });
    return total;
  }

  function clearSelection() {
    activityButtons.forEach(b => b.classList.remove("selected"));
  }

  function selectActivity(act) {
    clearSelection();
    const btn = document.querySelector(`.activity[data-activity="${act}"]`);
    if (btn) btn.classList.add("selected");
  }

  function updateUI(lastActivity = null) {
    const { state, clients } = getCurrentState();
    const client = clients.find(c => c.id === state.currentClientId);

    clientNameEl.textContent = client
      ? `Cliente: ${client.nombre}`
      : "Sin cliente activo";

    activityNameEl.textContent = lastActivity
      ? `Actividad: ${ACTIVITY_LABELS[lastActivity]}`
      : "—";

    if (timerInterval) clearInterval(timerInterval);

    if (client) {
      timerInterval = setInterval(() => {
        timerEl.textContent = formatTime(
          calculateClientTotal(client.id)
        );
      }, 1000);
    } else {
      timerEl.textContent = "00:00:00";
    }
  }

  activityButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const { state } = getCurrentState();
      if (!state.currentClientId) return;

      const act = btn.dataset.activity;
      changeActivity(act);
      selectActivity(act);
      updateUI(act);
    });
  });

  document.getElementById("newClient").onclick = () => {
    const n = prompt("Nombre cliente:");
    if (!n) return;
    newClient(n.trim());
    changeActivity("trabajo");
    selectActivity("trabajo");
    updateUI("trabajo");
  };

  document.getElementById("changeClient").onclick = () => {
    const { clients } = getCurrentState();
    const open = clients.filter(c => c.estado === "abierto");
    if (!open.length) return;

    let txt = "Cliente:\n";
    open.forEach((c, i) => txt += `${i + 1}. ${c.nombre}\n`);
    const sel = parseInt(prompt(txt), 10) - 1;
    if (!open[sel]) return;

    changeClient(open[sel].id);
    changeActivity("trabajo");
    selectActivity("trabajo");
    updateUI("trabajo");
  };

  document.getElementById("closeClient").onclick = () => {
    const { state, clients } = getCurrentState();
    const client = clients.find(c => c.id === state.currentClientId);
    if (!client) return;

    const total = calculateClientTotal(client.id);
    closeClient();

    infoText.innerHTML = `
      Cliente: ${client.nombre}<br>
      Tiempo total: ${formatTime(total)}
    `;
    infoPanel.classList.remove("hidden");

    clearSelection();
    updateUI(null);
  };

  focusBtn.onclick = () => {
    const { blocks } = getCurrentState();
    const now = Date.now();
    const start = now - FOCUS_WINDOW_MS;

    const totals = {
      trabajo: 0,
      telefono: 0,
      cliente: 0,
      estudio: 0,
      otros: 0
    };

    blocks.forEach(b => {
      const s = Math.max(b.inicio, start);
      const e = Math.min(b.fin ?? now, now);
      if (e > s) totals[b.actividad] += e - s;
    });

    const total = Object.values(totals).reduce((a, b) => a + b, 0);
    const pct = total ? Math.round((totals.trabajo / total) * 100) : 0;

    let estado = "🟢 Enfocado";
    if (pct < 40) estado = "🔴 Disperso";
    else if (pct < 65) estado = "🟡 Atención";

    let msg = "🎯 Enfoque (últimos 90 min)\n\n";
    Object.entries(totals).forEach(([a, t]) => {
      msg += `${ACTIVITY_LABELS[a]}: ${formatTime(t)}\n`;
    });
    msg += `\nTrabajo: ${pct}%\nEstado: ${estado}`;

    alert(msg);
  };

  todayBtn.onclick = () => {
    const { blocks } = getCurrentState();
    const now = new Date();

    const startDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();

    const totals = {
      trabajo: 0,
      telefono: 0,
      cliente: 0,
      estudio: 0,
      otros: 0
    };

    blocks.forEach(b => {
      const s = Math.max(b.inicio, startDay);
      const e = Math.min(b.fin ?? Date.now(), Date.now());
      if (e > s) totals[b.actividad] += e - s;
    });

    const totalDay = Object.values(totals).reduce((a, b) => a + b, 0);

    const filas = [
      ["Fecha", now.toISOString().slice(0, 10)],
      ["Trabajador", WORKER_NAME],
      [],
      ["Actividad", "Tiempo (HH:MM:SS)"]
    ];

    Object.entries(totals).forEach(([a, t]) => {
      filas.push([ACTIVITY_LABELS[a], formatTime(t)]);
    });

    filas.push([]);
    filas.push(["TOTAL", formatTime(totalDay)]);

    const csv = filas
      .map(fila => fila.map(v => `"${v}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `focowork-${safeName(WORKER_NAME)}-${now
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  updateUI();
});
