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

// ---------- UTILIDADES ----------

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function updateUI() {
  const { state, clients, blocks } = getCurrentState();

  const client = clients.find(c => c.id === state.currentClientId);
  const block = blocks.find(b => b.id === state.currentBlockId);

  clientNameEl.textContent = client
    ? `Cliente: ${client.nombre}`
    : "Sin cliente activo";

  activityNameEl.textContent = block
    ? `Actividad: ${block.actividad}`
    : "—";

  activityButtons.forEach(btn => {
    btn.classList.toggle(
      "active",
      block && btn.dataset.activity === block.actividad
    );
  });

  if (timerInterval) clearInterval(timerInterval);

  if (block) {
    timerInterval = setInterval(() => {
      timerEl.textContent = formatTime(Date.now() - block.inicio);
    }, 1000);
  } else {
    timerEl.textContent = "00:00:00";
  }
}

// ---------- ACTIVIDADES ----------

activityButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    changeActivity(btn.dataset.activity);
    updateUI();
  });
});

// ---------- NUEVO CLIENTE ----------

document.getElementById("newClient").addEventListener("click", () => {
  const name = prompt("Nombre corto del cliente:");
  if (name) {
    newClient(name.trim());
    updateUI();
  }
});

// ---------- CAMBIAR CLIENTE (ARREGLADO) ----------

document.getElementById("changeClient").addEventListener("click", () => {
  const { clients } = getCurrentState();
  const openClients = clients.filter(c => c.estado === "abierto");

  if (openClients.length === 0) {
    alert("No hay clientes abiertos");
    return;
  }

  let message = "Toca el número del cliente:\n\n";
  openClients.forEach((c, index) => {
    message += `${index + 1}. ${c.nombre}\n`;
  });

  const selected = prompt(message);
  const index = parseInt(selected, 10) - 1;

  if (!isNaN(index) && openClients[index]) {
    changeClient(openClients[index].id);
    updateUI();
  }
});

// ---------- CERRAR CLIENTE ----------

document.getElementById("closeClient").addEventListener("click", () => {
  closeClient();
  updateUI();
});

// ---------- INICIO ----------

updateUI();
