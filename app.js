import {
  newClient,
  changeClient,
  closeClient,
  changeActivity,
  getCurrentState
} from "./timeEngine.js";

/* =========================
   INICIO APP
========================= */
document.addEventListener("DOMContentLoaded", () => {

  /* =========================
     CONFIGURACIÓN
  ========================= */
  const ACTIVITY_LABELS = {
    trabajo: "Trabajo",
    telefono: "Teléfono",
    cliente: "Cliente",
    estudio: "Visitando",
    otros: "Otros"
  };

  /* =========================
     TRABAJADOR (1ª VEZ)
  ========================= */
  function getWorkerName() {
    let name = localStorage.getItem("focowork_worker");
    if (!name) {
      name = prompt("Nombre del trabajador (para reportes):");
      if (!name) name = "trabajador";
      localStorage.setItem("focowork_worker", name.trim());
    }
    return name.trim();
  }

  const WORKER_NAME = getWorkerName();

  /* =========================
     ELEMENTOS UI (SEGUROS)
  ========================= */
  const elClientName = document.getElementById("clientName");
  const elActivityName = document.getElementById("activityName");
  const elTimer = document.getElementById("timer");
  const activityButtons = document.querySelectorAll(".activity");

  const btnNew = document.getElementById("newClient");
  const btnChange = document.getElementById("changeClient");
  const btnClose = document.getElementById("closeClient");
  const btnFocus = document.getElementById("focusBtn");
  const btnReport = document.getElementById("todayBtn");

  let timerInterval = null;

  /* =========================
     UTILIDADES
  ========================= */
  function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const h = String(Math.floor(s / 3600)).padStart(2, "0");
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${h}:${m}:${sec}`;
  }

  function clearActivitySelection() {
    activityButtons.forEach(b => b.classList.remove("selected"));
  }

  function selectActivity(act) {
    clearActivitySelection();
    const btn = document.querySelector(`.activity[data-activity="${act}"]`);
    if (btn) btn.classList.add("selected");
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

  /* =========================
     ACTUALIZAR UI
  ========================= */
  function updateUI(lastActivity = null) {
    const { state, clients } = getCurrentState();
    const client = clients.find(c => c.id === state.currentClientId);

    if (elClientName) {
      elClientName.textContent = client
        ? `Cliente: ${client.nombre}`
        : "Sin cliente activo";
    }

    if (elActivityName) {
      elActivityName.textContent = lastActivity
        ? `Actividad: ${ACTIVITY_LABELS[lastActivity]}`
        : "—";
    }

    if (timerInterval) clearInterval(timerInterval);

    if (client && elTimer) {
      timerInterval = setInterval(() => {
        elTimer.textContent = formatTime(
          calculateClientTotal(client.id)
        );
      }, 1000);
    } else if (elTimer) {
      elTimer.textContent = "00:00:00";
    }
  }

  /* =========================
     ACTIVIDADES
  ========================= */
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

  /* =========================
     NUEVO CLIENTE
  ========================= */
  if (btnNew) {
    btnNew.addEventListener("click", () => {
      const name = prompt("Nombre del cliente:");
      if (!name) return;

      newClient(name.trim());
      changeActivity("trabajo");
      selectActivity("trabajo");
      updateUI("trabajo");
    });
  }

  /* =========================
     CAMBIAR CLIENTE
  ========================= */
  if (btnChange) {
    btnChange.addEventListener("click", () => {
      const { clients } = getCurrentState();
      const abiertos = clients.filter(c => c.estado === "abierto");
      if (!abiertos.length) {
        alert("No hay clientes abiertos");
        return;
      }

      let txt = "Selecciona cliente:\n";
      abiertos.forEach((c, i) => {
        txt += `${i + 1}. ${c.nombre}\n`;
      });

      const sel = parseInt(prompt(txt), 10) - 1;
      if (!abiertos[sel]) return;

      changeClient(abiertos[sel].id);
      changeActivity("trabajo");
      selectActivity("trabajo");
      updateUI("trabajo");
    });
  }

  /* =========================
     CERRAR CLIENTE
  ========================= */
  if (btnClose) {
    btnClose.addEventListener("click", () => {
      closeClient();
      clearActivitySelection();
      updateUI(null);
    });
  }

  /* =========================
     ENFOQUE (90 MIN)
  ========================= */
  if (btnFocus) {
    btnFocus.addEventListener("click", () => {
      const { blocks } = getCurrentState();
      const now = Date.now();
      const start = now - 90 * 60 * 1000;

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
    });
  }

  /* =========================
     REPORTE DIARIO (TXT)
  ========================= */
  if (btnReport) {
    btnReport.addEventListener("click", () => {
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

      let txt = `REPORTE DIARIO - FocoWork\n`;
      txt += `Trabajador: ${WORKER_NAME}\n`;
      txt += `Fecha: ${now.toLocaleDateString()}\n\n`;

      Object.entries(totals).forEach(([a, t]) => {
        txt += `${ACTIVITY_LABELS[a]}: ${formatTime(t)}\n`;
      });

      txt += `\nTOTAL: ${formatTime(totalDay)}\n`;

      const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `focowork-${WORKER_NAME}-${now.toISOString().slice(0, 10)}.txt`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  /* =========================
     ARRANQUE
  ========================= */
  updateUI();

});
