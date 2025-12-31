import {
  newClient,
  changeActivity,
  changeClient,
  closeClient,
  getCurrentState
} from "./timeEngine.js";

document.addEventListener("DOMContentLoaded", () => {

  const clientNameEl = document.getElementById("clientName");
  const activityNameEl = document.getElementById("activityName");
  const timerEl = document.getElementById("timer");
  const activityButtons = document.querySelectorAll(".activity");

  const btnNew = document.getElementById("newClient");
  const btnChange = document.getElementById("changeClient");
  const btnClose = document.getElementById("closeClient");
  const btnFocus = document.getElementById("focusBtn");
  const btnReport = document.getElementById("todayBtn");

  let timerInterval = null;

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

  function updateUI(lastActivity = null) {
    const { state, clients } = getCurrentState();
    const client = clients.find(c => c.id === state.currentClientId);

    clientNameEl.textContent = client
      ? `Cliente: ${client.nombre}`
      : "Sin cliente activo";

    activityNameEl.textContent = lastActivity
      ? `Actividad: ${lastActivity}`
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
      updateUI(act);
    });
  });

  btnNew?.addEventListener("click", () => {
    const name = prompt("Nombre del cliente:");
    if (!name) return;
    newClient(name.trim());
    updateUI("trabajo");
  });

  btnChange?.addEventListener("click", () => {
    const { clients } = getCurrentState();
    const abiertos = clients.filter(c => c.estado === "abierto");
    if (!abiertos.length) return;

    let txt = "Cliente:\n";
    abiertos.forEach((c, i) => txt += `${i + 1}. ${c.nombre}\n`);
    const sel = parseInt(prompt(txt), 10) - 1;
    if (!abiertos[sel]) return;

    changeClient(abiertos[sel].id);
    updateUI("trabajo");
  });

  btnClose?.addEventListener("click", () => {
    closeClient();
    updateUI(null);
  });

  btnFocus?.addEventListener("click", () => {
    alert("🎯 Modo enfoque activo");
  });

  btnReport?.addEventListener("click", () => {
    const { blocks } = getCurrentState();
    if (!blocks.length) return alert("Sin datos");

    let txt = "REPORTE DIARIO\n\n";
    blocks.forEach(b => {
      txt += `${b.actividad} - ${formatTime((b.fin ?? Date.now()) - b.inicio)}\n`;
    });

    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "focowork_reporte.txt";
    a.click();
  });

  updateUI();
});
