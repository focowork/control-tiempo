
let startTime = null;
let timerInterval = null;
let currentClient = null;
let activity = "Trabajo";

const LIMIT = 2;
const ACTIVATION_CODE = "FOCOWORK-35";

function isActivated() {
  return localStorage.getItem("focowork_activated") === "true";
}

function getClients() {
  return JSON.parse(localStorage.getItem("clients") || "[]");
}

function setActivity(a) {
  activity = a;
}

function newClient() {
  const clients = getClients();
  if (!isActivated() && clients.length >= LIMIT) {
    alert("Versión de prueba: máximo 2 clientes.");
    return;
  }
  const name = prompt("Nombre cliente:");
  if (!name) return;
  currentClient = name;
  startTime = Date.now();
  document.getElementById("status").innerText = "Cliente: " + name;
  startTimer();
}

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const diff = Math.floor((Date.now() - startTime)/1000);
    document.getElementById("timer").innerText = format(diff);
  },1000);
}

function closeClient() {
  if (!currentClient) return;
  clearInterval(timerInterval);
  const seconds = Math.floor((Date.now() - startTime)/1000);
  const clients = getClients();
  clients.push({
    date: new Date().toISOString().slice(0,10),
    client: currentClient,
    activity,
    seconds
  });
  localStorage.setItem("clients", JSON.stringify(clients));

  const msg = document.getElementById("message");
  msg.style.display="block";
  msg.innerText = "Cliente cerrado: " + currentClient + " ("+format(seconds)+")";

  currentClient=null;
  document.getElementById("status").innerText="Sin cliente activo";
  document.getElementById("timer").innerText="00:00:00";
}

function format(s){
  const h=String(Math.floor(s/3600)).padStart(2,'0');
  const m=String(Math.floor((s%3600)/60)).padStart(2,'0');
  const ss=String(s%60).padStart(2,'0');
  return `${h}:${m}:${ss}`;
}

function downloadReport() {
  const data = getClients();
  if (!data.length) return alert("Sin datos");
  let csv = "Fecha,Cliente,Actividad,Segundos,HH:MM:SS\n";
  data.forEach(r=>{
    csv += `${r.date},${r.client},${r.activity},${r.seconds},${format(r.seconds)}\n`;
  });
  const blob = new Blob([csv],{type:"text/csv"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="focowork_reporte.csv";
  a.click();
}

function activate() {
  const code = prompt("Introduce el código de activación:");
  if (code === ACTIVATION_CODE) {
    localStorage.setItem("focowork_activated","true");
    alert("✅ FocoWork activado correctamente");
    document.getElementById("trialBox").style.display="none";
  } else {
    alert("❌ Código incorrecto");
  }
}

window.onload = () => {
  if (isActivated()) {
    document.getElementById("trialBox").style.display="none";
  }
};
