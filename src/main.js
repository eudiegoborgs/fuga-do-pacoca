import {
  createInitialState,
  stepGame,
  loadEscapeRecords,
  formatEscapeTime,
  RECORDS_STORAGE_KEY,
} from './entities.js';
import { GameRenderer } from './renderer.js';
import { SoundEngine } from './audio.js';

const canvas = document.getElementById('game-canvas');
const renderer = new GameRenderer(canvas);
const sound = new SoundEngine();

let state = createInitialState();
let paused = true;
let peeRequested = false;
const keys = new Set();
const touchInput = { dx: 0, dy: 0 };

const heartsEl = document.getElementById('hud-hearts');
const peeEl = document.getElementById('hud-pee');
const peeBarEl = document.getElementById('hud-pee-bar');
const timerEl = document.getElementById('hud-timer');
const alertEl = document.getElementById('hud-alert');
const gameScreenBox = document.getElementById('game-screen-box');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const humansListEl = document.getElementById('humans-list');
const recordsListEl = document.getElementById('records-list');
const introModal = document.getElementById('intro-modal');
const endModal = document.getElementById('end-modal');
const endTitle = document.getElementById('end-title');
const endDesc = document.getElementById('end-desc');
const endRecordsEl = document.getElementById('end-records');
const endAvatar = document.getElementById('end-avatar');
const muteBtn = document.getElementById('mute-btn');

function renderRecordsList() {
  const records = loadEscapeRecords();
  if (recordsListEl) {
    if (records.length === 0) {
      recordsListEl.textContent = 'Sem recordes ainda. Fuja pelo Portão!';
    } else {
      recordsListEl.innerHTML = records
        .slice(0, 5)
        .map(
          (r, idx) =>
            `<div><strong>#${idx + 1}</strong> — ⏱️ <strong>${formatEscapeTime(r.time)}</strong> <span style="opacity:0.75">(${r.layoutId || 'planta'})</span></div>`
        )
        .join('');
    }
  }
  return records;
}

if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
  window
    .fetch('/api/records')
    .then((r) => (r.ok ? r.json() : null))
    .then((serverRecords) => {
      if (Array.isArray(serverRecords) && serverRecords.length > 0) {
        const local = loadEscapeRecords();
        const merged = [...local, ...serverRecords]
          .sort((a, b) => a.time - b.time)
          .slice(0, 10);
        try {
          localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(merged));
        } catch {
          // ignore
        }
        renderRecordsList();
      }
    })
    .catch(() => {});
}

function renderStaticAvatars() {
  for (const el of document.querySelectorAll('canvas[data-avatar]')) {
    renderer.renderAvatarCanvas(el, el.getAttribute('data-avatar'));
  }
}

function buildHumanCards() {
  humansListEl.innerHTML = '';
  const allCharacters = [...state.humans, ...(state.dogs || [])];
  for (const h of allCharacters) {
    const card = document.createElement('div');
    card.className = 'human-card';
    card.style.borderLeftColor = h.color;
    card.innerHTML = `
      <canvas class="avatar-canvas" width="44" height="44" data-avatar="${h.id}"></canvas>
      <div class="human-info">
        <h3>${h.name}</h3>
        <div class="role">${h.role}</div>
        <div class="live-status" id="status-${h.id}">${h.statusLabel}</div>
      </div>
    `;
    humansListEl.appendChild(card);
  }
  renderStaticAvatars();
}

function updateHUD() {
  const fullHearts = '❤️'.repeat(state.pacoca.hearts);
  const emptyHearts = '🖤'.repeat(state.pacoca.maxHearts - state.pacoca.hearts);
  heartsEl.textContent = `Pelo Seco: ${fullHearts}${emptyHearts}`;

  const maxCd = state.pacoca.peeMaxCooldown || 5.0;
  const peePct = Math.max(0, Math.min(100, (1 - state.pacoca.peeCooldown / maxCd) * 100));
  if (peeBarEl) {
    peeBarEl.style.width = `${peePct}%`;
    peeBarEl.style.background =
      peePct >= 100
        ? 'linear-gradient(90deg, #eab308, #facc15)'
        : 'linear-gradient(90deg, #0284c7, #38bdf8)';
  }

  if (state.pacoca.peeCooldown > 0) {
    peeEl.textContent = `💦 Xixi (E): ${state.pacoca.peeCooldown.toFixed(1)}s`;
    peeEl.style.opacity = '0.8';
  } else {
    peeEl.textContent = '💦 Xixi (E): Cheia!';
    peeEl.style.opacity = '1';
  }

  if (timerEl) {
    const records = loadEscapeRecords();
    const bestLabel = records.length > 0 ? formatEscapeTime(records[0].time) : '--';
    timerEl.textContent = `⏱️ ${formatEscapeTime(state.time)} | 🏆 ${bestLabel}`;
  }

  if (state.houseAlertTimer > 0) {
    alertEl.textContent = `🚨 Alerta: ${state.lastAlertSource}!`;
    alertEl.classList.add('alert');
  } else {
    alertEl.textContent = '🏠 Casa Calma';
    alertEl.classList.remove('alert');
  }

  for (const h of [...state.humans, ...(state.dogs || [])]) {
    const el = document.getElementById(`status-${h.id}`);
    if (el) {
      el.textContent = h.statusLabel;
      el.style.color =
        h.mode === 'chase' || h.mode === 'screaming' || h.mode === 'fighting' || h.mode === 'barking'
          ? '#f87171'
          : h.mode === 'cleaning_pee'
          ? '#facc15'
          : '#38bdf8';
    }
  }
}

function showEndModal() {
  endModal.classList.remove('hidden');
  const records = renderRecordsList();
  const bestLabel = records.length > 0 ? formatEscapeTime(records[0].time) : '--';

  if (state.status === 'won') {
    renderer.renderAvatarCanvas(endAvatar, 'pacoca');
    const summary = state.recordSummary;
    const isRecord = summary?.isNewRecord;
    endTitle.textContent = isRecord
      ? '🏆 NOVO RECORDE! O PAÇOCA GANHOU A RUA!'
      : '🎉 FUGA COMPLETA! O PAÇOCA GANHOU A RUA!';
    endDesc.textContent = `Tempo até a fuga: ${formatEscapeTime(state.escapeTime || state.time)}! O Paçoca driblou as 4 câmeras e todos os 5 humanos até passar pelo Portão!`;
    if (endRecordsEl) {
      endRecordsEl.textContent = `⏱️ Tempo da Fuga: ${formatEscapeTime(state.escapeTime || state.time)} | 🏆 Melhor Recorde (Localhost): ${bestLabel}`;
    }
  } else if (state.status === 'soaked') {
    renderer.renderAvatarCanvas(endAvatar, 'stefanny');
    endTitle.textContent = '🛁 ENCHARCADO PELA MANGUEIRA DA STÉFANNY!';
    endDesc.textContent =
      'O Paçoca tomou 3 jatos/poças de água com sabão e perdeu toda a coragem de fugir. Hora do banho!';
    if (endRecordsEl) {
      endRecordsEl.textContent = '';
    }
  } else if (state.status === 'captured' && state.capturedBy) {
    renderer.renderAvatarCanvas(endAvatar, state.capturedBy.id);
    endTitle.textContent = `🐾 PEGO NO COLO POR ${state.capturedBy.name.toUpperCase()}!`;
    endDesc.textContent = `${state.capturedBy.name} alcançou o Paçoca antes dele chegar no portão: "Volta já pra dentro, Paçoca!"`;
    if (endRecordsEl) {
      endRecordsEl.textContent = '';
    }
  }
}

function resetGame() {
  state = createInitialState();
  renderer.resetFog();
  paused = false;
  peeRequested = false;
  introModal.classList.add('hidden');
  endModal.classList.add('hidden');
  buildHumanCards();
  updateHUD();
}

function toggleFullscreen() {
  const target = gameScreenBox || canvas;
  if (!document.fullscreenElement) {
    if (target.requestFullscreen) {
      target.requestFullscreen().catch(() => {});
    }
  } else if (document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
}

document.addEventListener('fullscreenchange', () => {
  if (fullscreenBtn) {
    fullscreenBtn.textContent = document.fullscreenElement
      ? '🗗 Sair da Tela Cheia'
      : '⛶ Tela Cheia (F)';
  }
});

if (fullscreenBtn) {
  fullscreenBtn.addEventListener('click', () => {
    toggleFullscreen();
  });
}

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault();
  }
  if (e.key === ' ' && state.status !== 'playing') {
    resetGame();
    return;
  }
  const k = e.key.toLowerCase();
  if (k === 'f') {
    toggleFullscreen();
    return;
  }
  if (k === 'e' || e.key === ' ') {
    peeRequested = true;
  }
  keys.add(k);
});

window.addEventListener('keyup', (e) => {
  keys.delete(e.key.toLowerCase());
});

function getInputVector() {
  let dx = touchInput.dx;
  let dy = touchInput.dy;
  if (keys.has('arrowleft') || keys.has('a')) dx -= 1;
  if (keys.has('arrowright') || keys.has('d')) dx += 1;
  if (keys.has('arrowup') || keys.has('w')) dy -= 1;
  if (keys.has('arrowdown') || keys.has('s')) dy += 1;
  const pee = peeRequested;
  peeRequested = false;
  return { dx, dy, pee };
}

for (const btn of document.querySelectorAll('[data-dir]')) {
  const dir = btn.getAttribute('data-dir');
  const setDir = (active) => {
    if (!active) {
      touchInput.dx = 0;
      touchInput.dy = 0;
      return;
    }
    touchInput.dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    touchInput.dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
  };
  btn.addEventListener('pointerdown', () => setDir(true));
  btn.addEventListener('pointerup', () => setDir(false));
  btn.addEventListener('pointerleave', () => setDir(false));
}

document.getElementById('pee-btn').addEventListener('click', () => {
  sound.init();
  peeRequested = true;
});

document.getElementById('touch-pee-btn').addEventListener('click', () => {
  sound.init();
  peeRequested = true;
});

document.getElementById('start-btn').addEventListener('click', () => {
  sound.init();
  resetGame();
});

document.getElementById('restart-btn').addEventListener('click', () => {
  sound.init();
  resetGame();
});

document.getElementById('top-restart-btn').addEventListener('click', () => {
  sound.init();
  resetGame();
});

muteBtn.addEventListener('click', () => {
  const muted = sound.toggleMute();
  muteBtn.textContent = muted ? '🔇 Som' : '🔊 Som';
});

buildHumanCards();
renderRecordsList();
updateHUD();
renderer.render(state);

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (!paused && state.status === 'playing') {
    const input = getInputVector();
    stepGame(state, input, dt);
    for (const ev of state.soundEvents) {
      sound.playEvent(ev);
    }
    updateHUD();
    if (state.status !== 'playing') {
      showEndModal();
    }
  }

  renderer.render(state);
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
