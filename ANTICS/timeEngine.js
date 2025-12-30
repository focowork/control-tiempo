import {
  loadState,
  saveState,
  loadClients,
  saveClients,
  loadBlocks,
  saveBlocks
} from "./storage.js";

let state = loadState();
let clients = loadClients();
let blocks = loadBlocks();

function now() {
  return Date.now();
}

function generateId() {
  return crypto.randomUUID();
}

function getCurrentBlock() {
  return blocks.find(b => b.id === state.currentBlockId);
}

function closeCurrentBlock() {
  if (!state.currentBlockId) return;

  const block = getCurrentBlock();
  if (!block || block.fin) return;

  block.fin = now();
  saveBlocks(blocks);

  state.currentBlockId = null;
  saveState(state);
}

function startBlock(clienteId, actividad) {
  const block = {
    id: generateId(),
    cliente_id: clienteId,
    actividad,
    inicio: now(),
    fin: null
  };

  blocks.push(block);
  saveBlocks(blocks);

  state.currentBlockId = block.id;
  saveState(state);
}

export function newClient(nombre) {
  closeCurrentBlock();

  const client = {
    id: generateId(),
    nombre,
    estado: "abierto",
    creado_en: now(),
    cerrado_en: null
  };

  clients.push(client);
  saveClients(clients);

  state.currentClientId = client.id;
  saveState(state);

  startBlock(client.id, "trabajo");
}

export function changeActivity(actividad) {
  if (!state.currentClientId) return;
  closeCurrentBlock();
  startBlock(state.currentClientId, actividad);
}

export function changeClient(clienteId) {
  closeCurrentBlock();
  state.currentClientId = clienteId;
  saveState(state);
  startBlock(clienteId, "trabajo");
}

export function closeClient() {
  if (!state.currentClientId) return;

  closeCurrentBlock();

  const client = clients.find(c => c.id === state.currentClientId);
  if (!client) return;

  client.estado = "cerrado";
  client.cerrado_en = now();
  saveClients(clients);

  state.currentClientId = null;
  saveState(state);
}

export function getCurrentState() {
  return { state, clients, blocks };
}
