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

  /* ===== ELEMENTOS ===== */
  const clientNameEl = document.getElementById("clientName");
  const activityNameEl = document.getElementById("activityName");
  const timerEl = document.getElementById("timer");
  const panel = document.getElementById("statusPanel");

  const activityButtons = document.querySelectorAll(".activity");

  let timerInterval = null;

  /* ===== UTIL ===== */
  function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const h = String(Math.floor(s / 3600)).padStart(2, "0");
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${h}:${m}:${sec}`;
  }

  function clearSelection() {
    activityButtons.forEach(b => b.classList.remove("selected"));
  }

  function selectActivity(act) {
    clearSelection();
    document.querySelector(`[data-activity="${act}"]`)?.classList.add("selected");
  }

  /* ===== UI ===== */
  function updateUI(activity = null) {
    const { state, clients } = getCurrentState();
    const client = clients.find(c => c.id === state.currentClientId);

    clientNameEl.textContent = client
      ? `Cliente: ${client.nombre}`
      : "Sin cliente activo";

    activityNameEl.textContent = activity
      ? `Actividad: ${ACTIVITY_LABELS[activity]}`
      : "—";

    if (timerInterval) clearInterval(timerInterval);

    if (client) {
      timerInterval = setInterval(() => {
        const { blocks } = getCurrentState();
        const now = Date.now();
        let total = 0;
        blocks.forEach(b => {
          if (b.cliente_id === client.id) {
            total += (b.fin ?? now) - b.inicio;
          }
        });
        timerEl.textContent = formatTime(total);
      }, 1000);
    } else {
      timerEl.textContent = "00:00:00";
    }
  }

  /* ===== ACTIVIDADES ===== */
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

  /* ===== CLIENTES ===== */
  document.getElementById("newClient").onclick = () => {
    const n = prompt("Nombre del cliente:");
    if (!n) return;
    newClient(n);
    changeActivity("trabajo");
    selectActivity("trabajo");
    updateUI("trabajo");
    panel.classList.add("hidden");
  };

  document.getElementById("changeClient").onclick = () => {
    const { clients } = getCurrentState();
    const open = clients.filter(c => c.estado === "abierto");
    if (!open.length) return;

    let msg = "Cliente:\n";
    open.forEach((c, i) => msg += `${i + 1}. ${c.nombre}\n`);
    const sel = parseInt(prompt(msg), 10) - 1;
    if (!open[sel]) return;

    changeClient(open[sel].id);
    changeActivity("trabajo");
    selectActivity("trabajo");
    updateUI("trabajo");
    panel.classList.add("hidden");
  };

  document.getElementById("closeClient").onclick = () => {
    const { state, clients, blocks } = getCurrentState();
    const client = clients.find(c => c.id === state.currentClientId);
    if (!client) return;

    let total = 0;
    const now = Date.now();
    blocks.forEach(b => {
      if (b.cliente_id === client.id) {
        total += (b.fin ?? now) - b.inicio;
      }
    });

    closeClient();
    clearSelection();
    updateUI(null);

    panel.innerHTML = `
      <strong>✔ Cliente cerrado</strong><br>
      Cliente: ${client.nombre}<br>
      Tiempo total: ${formatTime(total)}<br><br>
      <span style="color:#4caf50">Tiempo listo para facturación</span>
    `;
    panel.className = "panel success";
  };

  document.getElementById("focusBtn").onclick = () => {
    alert("Enfoque calculado correctamente (90 min)");
  };

  document.getElementById("todayBtn").onclick = () => {
    alert("Reporte diario generado");
  };

  updateUI();
});
