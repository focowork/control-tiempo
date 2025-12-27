import {
  newClient,
  changeActivity,
  changeClient,
  closeClient,
  getCurrentState
} from "./timeEngine.js";

const clientNameEl = document.getElementById("clientName");
const activityNameEl = document.getElementById("activityName");
const timerEl = document.getElementById("timer");
const activityButtons = document.querySelectorAll(".activity");

let timerInterval = null;
const FOCUS_WINDOW_MS = 90 * 60 * 1000;

// ---------- UTILIDADES ----------

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// ---------- TOTAL CLIENTE ----------

function calculateClientTotal(clienteId) {
  const { blocks } = getCurrentState();
  const now = Date.now();
  let total = 0;

  blocks.forEach(b => {
    if (b.cliente_id === clienteId) {
      total += (b.fin ?? now) - b.inicio;
    }
  });

  return total;
}

// ---------- ENFOQUE ----------

function calculateFocusReport() {
  const { blocks } = getCurrentState();
  const now = Date.now();
  const startWindow = now - FOCUS_WINDOW_MS;

  const totals = {
    trabajo: 0,
    telefono: 0,
    cliente: 0,
    estudio: 0,
    otros: 0
  };

  blocks.forEach(b => {
    const start = Math.max(b.inicio, startWindow);
    const end = Math.min(b.fin ?? now, now);
    if (end > start) {
      totals[b.actividad] += end - start;
    }
  });

  const totalTime = Object.values(totals).reduce((a, b) => a + b, 0);
  const workPct = totalTime ? Math.round((totals.trabajo / totalTime) * 100) : 0;

  let status = "🟢 Enfocado";
  if (workPct < 40) status = "🔴 Dispersión";
  else if (workPct < 65) status = "🟡 Atención";

  return { totals, workPct, status };
}

function showFocusReport() {
  const r = calculateFocusReport();
  alert(
    `🎯 Enfoque (90 min)\n\n` +
    `Trabajo: ${formatTime(r.totals.trabajo)}\n` +
    `Teléfono: ${formatTime(r.totals.telefono)}\n` +
    `Cliente: ${formatTime(r.totals.cliente)}\n` +
    `Estudio: ${formatTime(r.totals.estudio)}\n` +
    `Otros: ${formatTime(r.totals.otros)}\n\n` +
    `Trabajo: ${r.workPct}%\nEstado: ${r.status}`
  );
}

// ---------- REPORTE DIARIO ----------

function buildDailyReportText() {
  const { blocks, clients } = getCurrentState();
  const now = new Date();
  const startDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();

  const byClient = {};
  const byActivity = {
    trabajo: 0,
    telefono: 0,
    cliente: 0,
    estudio: 0,
    otros: 0
  };

  blocks.forEach(b => {
    const start = Math.max(b.inicio, startDay);
    const end = Math.min(b.fin ?? Date.now(), Date.now());
    if (end <= start) return;

    const duration = end - start;
    byActivity[b.actividad] += duration;

    const client = clients.find(c => c.id === b.cliente_id);
    if (!client) return;

    byClient[client.nombre] =
      (byClient[client.nombre] || 0) + duration;
  });

  let txt = `REPORTE DIARIO\n${now.toLocaleDateString()}\n\n`;

  const totalDay = Object.values(byActivity)
    .reduce((a, b) => a + b, 0);

  txt += `Total: ${formatTime(totalDay)}\n\nPor cliente:\n`;
  Object.entries(byClient).forEach(([n, t]) => {
    txt += `- ${n}: ${formatTime(t)}\n`;
  });

  txt += `\nPor actividad:\n`;
  Object.entries(byActivity).forEach(([a, t]) => {
    txt += `${a}: ${formatTime(t)}\n`;
  });

  return txt;
}

function showDailyReport() {
  alert(buildDailyReportText());
}

// ---------- ARCHIVO ----------

function openReportInNewTab(text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// ---------- UI ----------

function updateActivityUI() {
  const { state } = getCurrentState();

  activityButtons.forEach(btn => {
    btn.classList.remove("active");

    if (
      state.currentActivity &&
      btn.dataset.activity === state.currentActivity
    ) {
      btn.classList.add("active");
    }
  });
}

function updateUI() {
  const { state, clients } = getCurrentState();
  const client = clients.find(c => c.id === state.currentClientId);

  clientNameEl.textContent = client
    ? `Cliente: ${client.nombre}`
    : "Sin cliente activo";

  activityNameEl.textContent = state.currentActivity
    ? `Actividad: ${state.currentActivity}`
    : "Actividad: —";

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

  updateActivityUI();
}

// ---------- EVENTOS ----------

activityButtons.forEach(btn => {
  btn.onclick = () => {
    const { state } = getCurrentState();

    if (!state.currentClientId) {
      alert("Primero crea o selecciona un cliente.");
      return;
    }

    changeActivity(btn.dataset.activity);
    updateUI();
  };
});

document.getElementById("newClient").onclick = () => {
  const n = prompt("Nombre cliente:");
  if (n) {
    newClient(n.trim());
    updateUI();
  }
};

document.getElementById("changeClient").onclick = () => {
  const { clients } = getCurrentState();
  const open = clients.filter(c => c.estado === "abierto");
  if (!open.length) {
    alert("No hay clientes abiertos.");
    return;
  }

  let m = "Cliente:\n";
  open.forEach((c, i) => m += `${i + 1}. ${c.nombre}\n`);
  const s = parseInt(prompt(m), 10) - 1;
  if (open[s]) {
    changeClient(open[s].id);
    updateUI();
  }
};

document.getElementById("closeClient").onclick = () => {
  closeClient();
  updateUI();
};

document.getElementById("focusReport").onclick = showFocusReport;
document.getElementById("dailyReport").onclick = showDailyReport;
document.getElementById("dailyPdf").onclick = () => {
  openReportInNewTab(buildDailyReportText());
};

updateUI();
