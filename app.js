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

// -------- UTIL --------

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

// -------- TOTAL CLIENTE --------

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

// -------- UI --------

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

// -------- EVENTOS --------

// BOTONES ACTIVIDAD (SOLO CAMBIAN TIEMPO)
activityButtons.forEach(btn => {
  btn.onclick = () => {
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

updateUI();
