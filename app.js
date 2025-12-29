import {
  newClient,
  changeActivity,
  changeClient,
  closeClient,
  getCurrentState
} from "./timeEngine.js";

/* ===============================
   CONFIGURACIÓN INICIAL
================================ */

// Etiquetas visibles
const ACTIVITY_LABELS = {
  trabajo: "Trabajo",
  telefono: "Teléfono",
  cliente: "Cliente",
  estudio: "Visitando",
  otros: "Otros"
};

// Pedir nombre trabajador SOLO la primera vez
function getWorkerName() {
  let name = localStorage.getItem("focowork_worker_name");

  if (!name) {
    name = prompt(
      "Nombre del trabajador:\n(se usará en los reportes)"
    );
    if (!name) name = "trabajador";
    localStorage.setItem("focowork_worker_name", name.trim());
  }
  return name.trim();
}

const WORKER_NAME = getWorkerName();

// Para nombres de archivo seguros
function safeName(str) {
  return str
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

// Formato tiempo hh:mm:ss
function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

/* ===============================
   DOM
================================ */

document.addEventListener("DOMContentLoaded", () => {
  const clientNameEl = document.getElementById("clientName");
  const activityNameEl = document.getElementById("activityName");
  const timerEl = document.getElementById("timer");
  const activityButtons = document.querySelectorAll(".activity");
  const closePanel = document.getElementById("closePanel");

  const focusBtn =
    document.getElementById("focusBtn") ||
    document.getElementById("focusReport");

  const todayBtn =
    document.getElementById("todayBtn") ||
    document.getElementById("dailyReport");

  let timerInterval = null;

  /* ===============================
     UI
  ================================ */

  function clearSelection() {
    activityButtons.forEach(b => b.classList.remove("selected"));
  }

  function selectActivity(act) {
    clearSelection();
    const btn = document.querySelector(
      `.activity[data-activity="${act}"]`
    );
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

  function updateUI(lastActivity = null) {
    const { state, clients } = getCurrentState();
    const client = clients.find(c => c.id === state.currentClientId);

    if (client) {
      clientNameEl.textContent = `Cliente: ${client.nombre}`;
    } else {
      clientNameEl.textContent = "Sin cliente activo";
    }

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

  function showClosePanel(cliente, totalMs) {
    if (!closePanel) return;

    closePanel.innerHTML = `
      <strong>✔ Cliente cerrado</strong><br>
      Cliente: ${cliente}<br>
      Tiempo total: ${formatTime(totalMs)}<br><br>
      <span style="color:#4caf50">
        Tiempo listo para facturación
      </span>
    `;
    closePanel.style.display = "block";
  }

  /* ===============================
     ACTIVIDADES
  ================================ */

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

  /* ===============================
     CLIENTES
  ================================ */

  document.getElementById("newClient")?.addEventListener("click", () => {
    const n = prompt("Nombre cliente:");
    if (!n) return;

    newClient(n.trim());
    changeActivity("trabajo");
    selectActivity("trabajo");
    if (closePanel) closePanel.style.display = "none";
    updateUI("trabajo");
  });

  document.getElementById("changeClient")?.addEventListener("click", () => {
    const { clients } = getCurrentState();
    const open = clients.filter(c => c.estado === "abierto");
    if (!open.length) return;

    let txt = "Cliente:\n";
    open.forEach((c, i) => (txt += `${i + 1}. ${c.nombre}\n`));
    const sel = parseInt(prompt(txt), 10) - 1;
    if (!open[sel]) return;

    changeClient(open[sel].id);
    changeActivity("trabajo");
    selectActivity("trabajo");
    if (closePanel) closePanel.style.display = "none";
    updateUI("trabajo");
  });

  document.getElementById("closeClient")?.addEventListener("click", () => {
    const { state, clients, blocks } = getCurrentState();
    if (!state.currentClientId) return;

    const client = clients.find(c => c.id === state.currentClientId);
    if (!client) return;

    const now = Date.now();
    let total = 0;

    blocks.forEach(b => {
      if (b.cliente_id === client.id) {
        total += (b.fin ?? now) - b.inicio;
      }
    });

    closeClient();
    clearSelection();
    updateUI(null);
    showClosePanel(client.nombre, total);
  });

  /* ===============================
     🎯 ENFOQUE (90 min)
  ================================ */

  if (focusBtn) {
    focusBtn.addEventListener("click", () => {
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

      let msg = `🎯 Enfoque (últimos 90 min)\n\n`;
      Object.entries(totals).forEach(([a, t]) => {
        msg += `${ACTIVITY_LABELS[a]}: ${formatTime(t)}\n`;
      });
      msg += `\nTrabajo: ${pct}%\nEstado: ${estado}`;

      alert(msg);
    });
  }

  /* ===============================
     📊 REPORTE CSV (Excel)
  ================================ */

  if (todayBtn) {
    todayBtn.addEventListener("click", () => {
      const { blocks, clients } = getCurrentState();
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);

      const rows = [];
      rows.push([
        "Fecha",
        "Trabajador",
        "Cliente",
        "Actividad",
        "Tiempo_segundos",
        "Tiempo_hhmmss"
      ]);

      blocks.forEach(b => {
        const client = clients.find(c => c.id === b.cliente_id);
        const seconds = Math.floor(
          ((b.fin ?? Date.now()) - b.inicio) / 1000
        );
        if (seconds <= 0) return;

        rows.push([
          dateStr,
          WORKER_NAME,
          client ? client.nombre : "—",
          ACTIVITY_LABELS[b.actividad],
          seconds,
          formatTime(seconds * 1000)
        ]);
      });

      const csv = rows.map(r => r.join(";")).join("\n");
      const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;"
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `focowork-${safeName(WORKER_NAME)}-${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }

  updateUI();
});
