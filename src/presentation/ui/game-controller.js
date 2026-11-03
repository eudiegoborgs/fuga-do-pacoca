/**
 * Controlador de Apresentação (DOM, HUD, Modais, Tela Cheia e Loop de Entrada).
 * Público-alvo: Desenvolvedores de UI/Frontend que alteram elementos HTML/CSS,
 * controles de smartphone / gamepad virtual ou atalhos de teclado.
 */
import { createGameContainer } from '../../container/ioc-container.js';
import { EstadoDaPartida } from '../../domain/partida-states.js';

export function bootstrapGamePresentation(container = createGameContainer()) {
  const canvas = document.getElementById('game-canvas');
  const rendererFactory = container.resolve('rendererFactory');
  const renderer = rendererFactory(canvas);
  const sound = container.resolve('soundEngine');
  const recordRepository = container.resolve('recordRepository');
  const simulation = container.resolve('simulationUseCase');
  const config = container.resolve('config');

  let state = simulation.createInitialState();
  let isPaused = true;
  let isPeeRequested = false;
  const pressedKeys = new Set();
  const touchInputVector = { dx: 0, dy: 0 };
  const activeTouchDirections = new Set();

  const heartsElement = document.getElementById('hud-hearts');
  const peeLabelElement = document.getElementById('hud-pee');
  const peeBarElement = document.getElementById('hud-pee-bar');
  const timerElement = document.getElementById('hud-timer');
  const alertElement = document.getElementById('hud-alert');
  const gameScreenBox = document.getElementById('game-screen-box');
  const fullscreenButton = document.getElementById('fullscreen-btn');
  const humansListElement = document.getElementById('humans-list');
  const recordsListElement = document.getElementById('records-list');
  const introModalElement = document.getElementById('intro-modal');
  const endModalElement = document.getElementById('end-modal');
  const endTitleElement = document.getElementById('end-title');
  const endDescriptionElement = document.getElementById('end-desc');
  const endRecordsElement = document.getElementById('end-records');
  const endAvatarCanvas = document.getElementById('end-avatar');
  const muteButton = document.getElementById('mute-btn');

  function renderStaticAvatars() {
    for (const avatarCanvas of document.querySelectorAll('canvas[data-avatar]')) {
      renderer.renderAvatarCanvas(avatarCanvas, avatarCanvas.getAttribute('data-avatar'));
    }
  }

  function renderRecordsLeaderboard() {
    const records = recordRepository.load();
    if (recordsListElement) {
      if (records.length === 0) {
        recordsListElement.textContent = 'Sem recordes ainda. Fuja pelo Portão!';
      } else {
        const displayLimit = config.environment.leaderboardDisplayLimit || 5;
        recordsListElement.innerHTML = records
          .slice(0, displayLimit)
          .map(
            (record, index) =>
              `<div><strong>#${index + 1}</strong> — ⏱️ <strong>${recordRepository.formatEscapeTime(record.time)}</strong> <span style="opacity:0.75">(${record.layoutId || 'planta'})</span></div>`
          )
          .join('');
      }
    }
    return records;
  }

  function buildCharacterRosterCards() {
    humansListElement.innerHTML = '';
    const allHouseCharacters = [...state.humans, ...(state.dogs || [])];
    for (const character of allHouseCharacters) {
      const card = document.createElement('div');
      card.className = 'human-card';
      card.style.borderLeftColor = character.color;
      card.innerHTML = `
        <canvas class="avatar-canvas" width="44" height="44" data-avatar="${character.id}"></canvas>
        <div class="human-info">
          <h3>${character.name}</h3>
          <div class="role">${character.role}</div>
          <div class="live-status" id="status-${character.id}">${character.statusLabel}</div>
        </div>
      `;
      humansListElement.appendChild(card);
    }
    renderStaticAvatars();
  }

  function updateHeadsUpDisplay() {
    const fullHearts = '❤️'.repeat(state.pacoca.hearts);
    const emptyHearts = '🖤'.repeat(state.pacoca.maxHearts - state.pacoca.hearts);
    heartsElement.textContent = `Pelo Seco: ${fullHearts}${emptyHearts}`;

    const maxCooldown = state.pacoca.peeMaxCooldown || config.gameplay.peeCooldownSeconds;
    const peePercentage = Math.max(
      0,
      Math.min(100, (1 - state.pacoca.peeCooldown / maxCooldown) * 100)
    );
    if (peeBarElement) {
      peeBarElement.style.width = `${peePercentage}%`;
      peeBarElement.style.background =
        peePercentage >= 100
          ? 'linear-gradient(90deg, #eab308, #facc15)'
          : 'linear-gradient(90deg, #0284c7, #38bdf8)';
    }

    if (state.pacoca.peeCooldown > 0) {
      peeLabelElement.textContent = `💦 Xixi (E): ${state.pacoca.peeCooldown.toFixed(1)}s`;
      peeLabelElement.style.opacity = '0.8';
    } else {
      peeLabelElement.textContent = '💦 Xixi (E): Cheia!';
      peeLabelElement.style.opacity = '1';
    }

    if (timerElement) {
      const records = recordRepository.load();
      const bestTimeLabel = records.length > 0 ? recordRepository.formatEscapeTime(records[0].time) : '--';
      timerElement.textContent = `⏱️ ${recordRepository.formatEscapeTime(state.time)} | 🏆 ${bestTimeLabel}`;
    }

    if (state.houseAlertTimer > 0) {
      alertElement.textContent = `🚨 Alerta: ${state.lastAlertSource}!`;
      alertElement.classList.add('alert');
    } else {
      alertElement.textContent = '🏠 Casa Calma';
      alertElement.classList.remove('alert');
    }

    for (const character of [...state.humans, ...(state.dogs || [])]) {
      const statusElement = document.getElementById(`status-${character.id}`);
      if (statusElement) {
        statusElement.textContent = character.statusLabel;
        statusElement.style.color =
          character.mode === 'chase' ||
          character.mode === 'screaming' ||
          character.mode === 'fighting' ||
          character.mode === 'barking'
            ? '#f87171'
            : character.mode === 'cleaning_pee'
            ? '#facc15'
            : '#38bdf8';
      }
    }
  }

  function showEndOfMatchModal() {
    endModalElement.classList.remove('hidden');
    const records = renderRecordsLeaderboard();
    const bestTimeLabel = records.length > 0 ? recordRepository.formatEscapeTime(records[0].time) : '--';

    if (state.status === EstadoDaPartida.FUGA_CONCLUIDA) {
      renderer.renderAvatarCanvas(endAvatarCanvas, 'pacoca');
      const isNewRecord = state.recordSummary?.isNewRecord;
      endTitleElement.textContent = isNewRecord
        ? '🏆 NOVO RECORDE! O PAÇOCA GANHOU A RUA!'
        : '🎉 FUGA COMPLETA! O PAÇOCA GANHOU A RUA!';
      endDescriptionElement.textContent = `Tempo até a fuga: ${recordRepository.formatEscapeTime(state.escapeTime || state.time)}! O Paçoca driblou as câmeras e todos os humanos até passar pelo Portão!`;
      if (endRecordsElement) {
        endRecordsElement.textContent = `⏱️ Tempo da Fuga: ${recordRepository.formatEscapeTime(state.escapeTime || state.time)} | 🏆 Melhor Recorde (Localhost): ${bestTimeLabel}`;
      }
    } else if (state.status === EstadoDaPartida.ENCHARCADO_DE_BANHO) {
      renderer.renderAvatarCanvas(endAvatarCanvas, 'stefanny');
      endTitleElement.textContent = '🛁 ENCHARCADO PELA MANGUEIRA DA STÉFANNY!';
      endDescriptionElement.textContent =
        'O Paçoca tomou 3 jatos/poças de água com sabão e perdeu toda a coragem de fugir. Hora do banho!';
      if (endRecordsElement) {
        endRecordsElement.textContent = '';
      }
    } else if (state.status === EstadoDaPartida.CAPTURADO_NO_COLO && state.capturedBy) {
      renderer.renderAvatarCanvas(endAvatarCanvas, state.capturedBy.id);
      endTitleElement.textContent = `🐾 PEGO NO COLO POR ${state.capturedBy.name.toUpperCase()}!`;
      endDescriptionElement.textContent = `${state.capturedBy.name} alcançou o Paçoca antes dele chegar no portão: "Volta já pra dentro, Paçoca!"`;
      if (endRecordsElement) {
        endRecordsElement.textContent = '';
      }
    }
  }

  function startOrResetMatch() {
    state = simulation.createInitialState();
    renderer.resetFog();
    isPaused = false;
    isPeeRequested = false;
    introModalElement.classList.add('hidden');
    endModalElement.classList.add('hidden');
    buildCharacterRosterCards();
    updateHeadsUpDisplay();
  }

  function toggleFullscreenMode() {
    const fullscreenTarget = gameScreenBox || canvas;
    if (!document.fullscreenElement) {
      if (fullscreenTarget.requestFullscreen) {
        fullscreenTarget.requestFullscreen().catch(() => {});
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }

  document.addEventListener('fullscreenchange', () => {
    if (fullscreenButton) {
      fullscreenButton.textContent = document.fullscreenElement
        ? '🗗 Sair da Tela Cheia'
        : '⛶ Tela Cheia (F)';
    }
  });

  if (fullscreenButton) {
    fullscreenButton.addEventListener('click', toggleFullscreenMode);
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    if (event.key === ' ' && state.status !== EstadoDaPartida.EM_ANDAMENTO) {
      startOrResetMatch();
      return;
    }
    const keyLower = event.key.toLowerCase();
    if (keyLower === 'f') {
      toggleFullscreenMode();
      return;
    }
    if (keyLower === 'e' || event.key === ' ') {
      isPeeRequested = true;
    }
    pressedKeys.add(keyLower);
  });

  window.addEventListener('keyup', (event) => {
    pressedKeys.delete(event.key.toLowerCase());
  });

  function recalculateTouchDirectionVector() {
    let dx = 0;
    let dy = 0;
    if (activeTouchDirections.has('left')) dx -= 1;
    if (activeTouchDirections.has('right')) dx += 1;
    if (activeTouchDirections.has('up')) dy -= 1;
    if (activeTouchDirections.has('down')) dy += 1;
    touchInputVector.dx = dx;
    touchInputVector.dy = dy;
  }

  function readPlayerInputCommand() {
    let dx = touchInputVector.dx;
    let dy = touchInputVector.dy;
    if (pressedKeys.has('arrowleft') || pressedKeys.has('a')) dx -= 1;
    if (pressedKeys.has('arrowright') || pressedKeys.has('d')) dx += 1;
    if (pressedKeys.has('arrowup') || pressedKeys.has('w')) dy -= 1;
    if (pressedKeys.has('arrowdown') || pressedKeys.has('s')) dy -= 1;
    const pee = isPeeRequested;
    isPeeRequested = false;
    return { dx, dy, pee };
  }

  // Controles virtuais na tela (Gamepad D-pad)
  for (const dirButton of document.querySelectorAll('[data-dir]')) {
    const direction = dirButton.getAttribute('data-dir');
    const startDirection = (e) => {
      e.preventDefault();
      sound.init();
      activeTouchDirections.add(direction);
      dirButton.classList.add('active');
      recalculateTouchDirectionVector();
    };
    const endDirection = (e) => {
      e.preventDefault();
      activeTouchDirections.delete(direction);
      dirButton.classList.remove('active');
      recalculateTouchDirectionVector();
    };

    dirButton.addEventListener('pointerdown', startDirection);
    dirButton.addEventListener('pointerup', endDirection);
    dirButton.addEventListener('pointercancel', endDirection);
    dirButton.addEventListener('pointerleave', endDirection);
  }

  // Toque / Arrastar diretamente no Canvas (Virtual Thumbstick para Smartphones)
  let touchOrigin = null;
  canvas.addEventListener(
    'touchstart',
    (e) => {
      sound.init();
      if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        touchOrigin = {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        };
      }
    },
    { passive: false }
  );

  canvas.addEventListener(
    'touchmove',
    (e) => {
      if (!touchOrigin || !e.touches || e.touches.length === 0) return;
      e.preventDefault(); // Impede scroll indesejado enquanto joga no celular
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const currentX = touch.clientX - rect.left;
      const currentY = touch.clientY - rect.top;
      const deltaX = currentX - touchOrigin.x;
      const deltaY = currentY - touchOrigin.y;
      const distance = Math.hypot(deltaX, deltaY);
      const deadzone = 12;

      if (distance > deadzone) {
        touchInputVector.dx = Math.max(-1, Math.min(1, deltaX / Math.max(distance, 35)));
        touchInputVector.dy = Math.max(-1, Math.min(1, deltaY / Math.max(distance, 35)));
      } else {
        recalculateTouchDirectionVector();
      }
    },
    { passive: false }
  );

  const resetCanvasTouch = () => {
    touchOrigin = null;
    recalculateTouchDirectionVector();
  };
  canvas.addEventListener('touchend', resetCanvasTouch);
  canvas.addEventListener('touchcancel', resetCanvasTouch);

  // Ações de Xixi (Botão superior e Botão do Gamepad Virtual)
  const triggerPeeAction = (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    sound.init();
    isPeeRequested = true;
  };

  const peeButtonTop = document.getElementById('pee-btn');
  if (peeButtonTop) peeButtonTop.addEventListener('click', triggerPeeAction);

  const screenPeeButton = document.getElementById('touch-screen-pee-btn');
  if (screenPeeButton) {
    screenPeeButton.addEventListener('pointerdown', triggerPeeAction);
  }

  const legacyTouchPee = document.getElementById('touch-pee-btn');
  if (legacyTouchPee) {
    legacyTouchPee.addEventListener('pointerdown', triggerPeeAction);
  }

  // Inicialização e Reinício
  const startButton = document.getElementById('start-btn');
  if (startButton) {
    startButton.addEventListener('click', () => {
      sound.init();
      startOrResetMatch();
    });
  }

  const restartButton = document.getElementById('restart-btn');
  if (restartButton) {
    restartButton.addEventListener('click', () => {
      sound.init();
      startOrResetMatch();
    });
  }

  const topRestartButton = document.getElementById('top-restart-btn');
  if (topRestartButton) {
    topRestartButton.addEventListener('click', () => {
      sound.init();
      startOrResetMatch();
    });
  }

  if (muteButton) {
    muteButton.addEventListener('click', () => {
      const isMuted = sound.toggleMute();
      muteButton.textContent = isMuted ? '🔇 Som' : '🔊 Som';
    });
  }

  recordRepository.syncWithServer(() => renderRecordsLeaderboard());
  buildCharacterRosterCards();
  renderRecordsLeaderboard();
  updateHeadsUpDisplay();
  renderer.render(state);

  let previousTimestamp = performance.now();
  function runFrameLoop(currentTimestamp) {
    const maxDelta = config.movement.maxFrameDeltaSeconds || 0.05;
    const dt = Math.min(maxDelta, (currentTimestamp - previousTimestamp) / 1000);
    previousTimestamp = currentTimestamp;

    if (!isPaused && state.status === EstadoDaPartida.EM_ANDAMENTO) {
      const playerInput = readPlayerInputCommand();
      simulation.stepGame(state, playerInput, dt);
      for (const soundEvent of state.soundEvents) {
        sound.playEvent(soundEvent);
      }
      updateHeadsUpDisplay();
      if (state.status !== EstadoDaPartida.EM_ANDAMENTO) {
        showEndOfMatchModal();
      }
    }

    renderer.render(state);
    requestAnimationFrame(runFrameLoop);
  }

  requestAnimationFrame(runFrameLoop);
}
