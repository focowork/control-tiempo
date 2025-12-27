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

// ---------- UTIL ----------

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

// ---------- TOTAL CLIENTE ----------

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

// ---------- UI ----------

function updateUI() {
  const { state, clients } = getCurrentState();
  const client = clients.find(c => c.id === state.currentClientId);

  clientNameEl.textContent = client
    ? `Cliente: ${client.nombre}`
    : "Sin cliente activo";

  activityNameEl.textContent = state.currentActivity
    ? `Actividad: ${state.currentActivity}`
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

// ---------- ACTIVIDADES ----------

activityButtons.forEach(btn => {
  btn.onclick = () => {
    changeActivity(btn.dataset.activity);
    updateUI();
  };
});

// ---------- CLIENTES ----------

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
  if (!open.length) return;

  let txt = "Cliente:\n";
  open.forEach((c, i) => txt += `${i + 1}. ${c.nombre}\n`);
  const sel = parseInt(prompt(txt), 10) - 1;
  if (open[sel]) {
    changeClient(open[sel].id);
    updateUI();
  }
};

document.getElementById("closeClient").onclick = () => {
  closeClient();
  updateUI();
};

// ---------- ENFOQUE ----------

document.getElementById("focusBtn").onclick = () => {
  const { blocks } = getCurrentState();
  const now = Date.now();
  const start = now - FOCUS_WINDOW_MS;

  const totals = {
    trabajo: 0, telefono: 0, cliente: 0, estudio: 0, otros: 0
  };

  blocks.forEach(b => {
    const s = Math.max(b.inicio, start);
    const e = Math.min(b.fin ?? now, now);
    if (e > s) totals[b.actividad] += e - s;
  });

  const total = Object.values(totals).reduce((a, b) => a + b, 0);
  const pct = total ? Math.round((totals.trabajo / total) * 100) : 0;

  alert(
    `🎯 Enfoque (90 min)\n\n` +
    Object.entries(totals)
      .map(([k, v]) => `${k}: ${formatTime(v)}`)
      .join("\n") +
    `\n\nTrabajo: ${pct}%`
  );
};

// ---------- REPORTE HOY (TXT) ----------

document.getElementById("todayBtn").onclick = () => {
  const { blocks, clients } = getCurrentState();
  const now = new Date();
  const startDay = new Date(
    now.getFullYear(), now.getMonth(), now.getDate()
  ).getTime();

  const byClient = {};

  blocks.forEach(b => {
    const s = Math.max(b.inicio, startDay);
    const e = Math.min(b.fin ?? Date.now(), Date.now());
    if (e <= s) return;

    const c = clients.find(x => x.id === b.cliente_id);
    if (!c) return;

    byClient[c.nombre] =
      (byClient[c.nombre] || 0) + (e - s);
  });

  let txt = `REPORTE ${now.toLocaleDateString()}\n\n`;
  Object.entries(byClient).forEach(([n, t]) => {
    txt += `${n}: ${formatTime(t)}\n`;
  });

  const blob = new Blob([txt], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
};

updateUI();
