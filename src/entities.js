import {
  MAP_CONFIG,
  generateHouseLayout,
  circleIntersectsRect,
  resolveWallCollisions,
  hasLineOfSight,
  isPointInCone,
} from './map.js';

export const BASE_SPEED = 210;
export const HUMAN_VISION_RANGE = 190;
export const MEGGIE_VISION_RANGE = HUMAN_VISION_RANGE / 2;
export const RECORDS_STORAGE_KEY = 'fuga_do_pacoca_records';

let memoryRecordsFallback = [];

export function formatEscapeTime(seconds) {
  const val = Number(seconds);
  if (!Number.isFinite(val) || val < 0) return '--';
  return `${val.toFixed(2)}s`;
}

export function loadEscapeRecords(storage = globalThis?.localStorage) {
  try {
    if (storage && typeof storage.getItem === 'function') {
      const raw = storage.getItem(RECORDS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // fallback to memory store
  }
  return [...memoryRecordsFallback];
}

export function clearEscapeRecords(storage = globalThis?.localStorage) {
  memoryRecordsFallback = [];
  try {
    if (storage && typeof storage.removeItem === 'function') {
      storage.removeItem(RECORDS_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function recordEscapeWin(
  timeSeconds,
  layoutId = 'planta_01',
  storage = globalThis?.localStorage,
  status = 'won'
) {
  if (status !== 'won') {
    return null;
  }
  const cleanTime = Math.max(0.01, Number(Number(timeSeconds || 0).toFixed(2)));
  const existing = loadEscapeRecords(storage);
  const previousBest = existing.length > 0 ? existing[0].time : Infinity;
  const entry = {
    time: cleanTime,
    layoutId: layoutId || 'planta_01',
    status: 'won',
    date: new Date().toISOString(),
  };
  const updated = [...existing, entry]
    .sort((a, b) => a.time - b.time)
    .slice(0, 10);

  memoryRecordsFallback = updated;
  try {
    if (storage && typeof storage.setItem === 'function') {
      storage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch {
    // ignore storage errors
  }

  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    window
      .fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
      .catch(() => {});
  }

  const rank = updated.findIndex((r) => r === entry) + 1;
  return {
    entry,
    bestTime: updated[0].time,
    isNewRecord: cleanTime <= previousBest,
    rank: rank || updated.length,
    records: updated,
  };
}

function rotateCircuit(arr, startIndex) {
  return [...arr.slice(startIndex), ...arr.slice(0, startIndex)];
}

export function createInitialState() {
  const map = generateHouseLayout();
  const circuit = map.houseAndYardCircuit;
  const q2 = map.rooms.find((r) => r.id === 'quarto_2');
  const q3 = map.rooms.find((r) => r.id === 'quarto_3');
  const cozinha = map.rooms.find((r) => r.id === 'cozinha');
  const sala = map.rooms.find((r) => r.id === 'sala');

  const spikeSpots = [
    { x: q2 ? q2.x + 85 : 565, y: q2 ? q2.y + 88 : 530 },
    { x: q3 ? q3.x + 85 : 565, y: q3 ? q3.y + 88 : 665 },
    { x: cozinha ? cozinha.x + 70 : 260, y: cozinha ? cozinha.y + 95 : 285 },
    { x: sala ? sala.x + 75 : 265, y: sala ? sala.y + 190 : 635 },
  ];

  const spike = {
    id: 'spike',
    name: 'Spike',
    role: 'Cão (Parado / Área de Domínio)',
    color: '#d97706',
    x: spikeSpots[0].x,
    y: spikeSpots[0].y,
    radius: 12,
    domainRadius: MEGGIE_VISION_RANGE,
    isStationary: true,
    angle: 0,
    mode: 'sleeping', // 'sleeping' | 'fighting' (fica sempre parado!)
    isLyingDown: true,
    fightTimer: 0,
    fightCooldown: 0,
    spotIndex: 0,
    spots: spikeSpots,
    statusLabel: 'Parado (Área de Domínio) 💤',
    speech: '',
    speechTimer: 0,
  };

  const corrX = circuit[10]?.x || 460;
  const q2DoorY = q2 ? q2.y + 36 : 480;
  const q3DoorY = q3 ? q3.y + 36 : 620;
  const meggieWaypoints = [
    { x: 265, y: 300 },
    { x: 375, y: 330 },
    { x: corrX, y: 330 },
    { x: corrX, y: q2DoorY },
    { x: q2 ? q2.x + 55 : corrX + 55, y: q2DoorY },
    { x: corrX, y: q2DoorY },
    { x: corrX, y: q3DoorY },
    { x: q3 ? q3.x + 55 : corrX + 55, y: q3DoorY },
    { x: corrX, y: q3DoorY },
    { x: corrX, y: 585 },
    { x: 270, y: 585 },
    { x: 375, y: 440 },
  ];

  const meggie = {
    id: 'meggie',
    name: 'Meggie',
    role: 'Yorkshire Pequena (Anda pela Casa)',
    color: '#eab308',
    x: meggieWaypoints[0].x,
    y: meggieWaypoints[0].y,
    radius: 9,
    angle: 0,
    fov: 0.95,
    visionRange: MEGGIE_VISION_RANGE, // Metade do raio de visão dos humanos (95 vs 190)
    patrolMultiplier: 0.68,
    mode: 'patrol', // 'patrol' | 'barking'
    barkTimer: 0,
    barkCooldown: 0,
    waypointIndex: 1,
    waypoints: meggieWaypoints,
    statusLabel: 'Andando pela casa 🐾',
    speech: '',
    speechTimer: 0,
  };

  return {
    status: 'playing', // 'playing' | 'won' | 'captured' | 'soaked'
    time: 0,
    escapeTime: null,
    recordSummary: null,
    map,
    capturedBy: null,
    houseAlertTimer: 0,
    lastAlertSource: '',
    soundEvents: [],
    puddles: [],
    peePuddles: [],
    spike,
    meggie,
    dogs: [spike, meggie],

    pacoca: {
      x: map.spawn.x,
      y: map.spawn.y,
      radius: 12,
      angle: Math.PI,
      hearts: 3,
      maxHearts: 3,
      invulnTimer: 0,
      slowTimer: 0,
      fightTimer: 0,
      peeCooldown: 0,
      peeMaxCooldown: 5.0,
      peeingTimer: 0,
      furShakePhase: 0,
      isMoving: false,
    },

    cameras: map.cameras.map((cam) => ({
      ...cam,
      angle: cam.baseAngle,
      sweepSpeed: cam.speed,
      exposure: 0,
      alerted: false,
      alertCooldown: 0,
    })),

    humans: [
      {
        id: 'emily',
        name: 'Emily',
        role: 'Irmã (Balé / Patins)',
        color: '#ec4899',
        x: 270,
        y: 580,
        radius: 14,
        angle: -Math.PI / 2,
        fov: 0.95,
        visionRange: HUMAN_VISION_RANGE,
        patrolMultiplier: 0.72,
        chaseMultiplier: 0.85,
        reactionDelay: 1.3, // Maior tempo de reação (mais distraída no balé/patins)
        mode: 'patrol', // 'patrol' | 'reacting' | 'screaming' | 'chase' | 'investigate' | 'pirouette'
        statusLabel: 'Patinando 🛼',
        speech: '',
        speechTimer: 0,
        reactionTimer: 0,
        screamTimer: 0,
        pirouetteTimer: 5.5,
        pirouetteDuration: 0,
        lostSightTimer: 0,
        investigateTarget: null,
        waypointIndex: 0,
        waypoints: rotateCircuit(circuit, 1),
      },
      {
        id: 'diego',
        name: 'Diego',
        role: 'Pai (Forte / Calls)',
        color: '#3b82f6',
        x: circuit[8].x,
        y: circuit[8].y,
        radius: 20, // 1.4x larger hitbox
        angle: 0,
        fov: 1.0,
        visionRange: HUMAN_VISION_RANGE,
        patrolMultiplier: 0.65,
        chaseMultiplier: 1.0, // Igual à velocidade do Paçoca!
        reactionDelay: 0.4, // Adulto: reação rápida (0.4s)
        mode: 'patrol',
        statusLabel: 'Falando sozinho 💭',
        speech: 'Hmm, preciso revisar aquele código...',
        speechTimer: 3.0,
        reactionTimer: 0,
        inCall: false,
        callTimer: 0,
        callCooldown: 12.0,
        lostSightTimer: 0,
        investigateTarget: null,
        waypointIndex: 0,
        waypoints: rotateCircuit(circuit, 8),
      },
      {
        id: 'stefanny',
        name: 'Stéfanny',
        role: 'Mãe (Chefe / Na Garagem)',
        color: '#a855f7',
        x: 250,
        y: 860,
        radius: 15,
        angle: -Math.PI / 2,
        fov: 1.05,
        visionRange: HUMAN_VISION_RANGE,
        patrolMultiplier: 0.75,
        chaseMultiplier: 1.18, // Mais rápida que o Paçoca!
        reactionDelay: 0.4, // Adulta: reação rápida (0.4s)
        stayInGarage: true,
        mode: 'patrol', // 'patrol' | 'reacting' | 'chase' | 'investigate' | 'distracted'
        statusLabel: 'Rondando a Garagem 💦',
        speech: '',
        speechTimer: 0,
        reactionTimer: 0,
        waterActive: true,
        waterRange: 130,
        puddleSpawnTimer: 1.2,
        distractionCooldown: 9.5,
        distractionTimer: 0,
        lostSightTimer: 0,
        investigateTarget: null,
        waypointIndex: 0,
        waypoints: [
          { x: 110, y: 820 },
          { x: 405, y: 810 },
          { x: 375, y: 945 },
          { x: 130, y: 940 },
        ],
      },
      {
        id: 'bryan',
        name: 'Bryan',
        role: 'Irmão (Cantarolando)',
        color: '#10b981',
        x: 458,
        y: 520,
        radius: 13,
        angle: -Math.PI / 2,
        fov: 0.95,
        visionRange: HUMAN_VISION_RANGE,
        patrolMultiplier: 0.82,
        chaseMultiplier: 0.92,
        reactionDelay: 0.8, // Criança: reação intermediária (0.8s)
        mode: 'patrol',
        statusLabel: 'Cantarolando 🎵',
        speech: '♪ ♫ ♪',
        speechTimer: 99,
        reactionTimer: 0,
        isHumming: true,
        notePhase: 0,
        callMomCooldown: 12.5,
        lostSightTimer: 0,
        investigateTarget: null,
        waypointIndex: 0,
        waypoints: rotateCircuit(circuit, 11),
      },
      {
        id: 'arthur',
        name: 'Arthur',
        role: 'Irmão (Skate no Quintal)',
        color: '#f59e0b',
        x: 450,
        y: 85,
        radius: 13,
        angle: Math.PI,
        fov: 0.9,
        visionRange: HUMAN_VISION_RANGE,
        patrolMultiplier: 0.95,
        chaseMultiplier: 1.05,
        reactionDelay: 0.8, // Criança: reação intermediária (0.8s)
        stayInYard: true,
        mode: 'patrol', // 'patrol' | 'reacting' | 'chase' | 'investigate' | 'trick'
        statusLabel: 'Skate no Quintal 🛹',
        speech: '',
        speechTimer: 0,
        reactionTimer: 0,
        trickCooldown: 6.5,
        trickTimer: 0,
        lostSightTimer: 0,
        investigateTarget: null,
        waypointIndex: 0,
        waypoints: map.yardWaypoints.map((wp) => ({ ...wp })),
      },
    ],
  };
}

function isInYard(x, y) {
  return x < 160 || y < 160;
}

function isInGarage(x, y) {
  return y >= 736 && x < 470;
}

function isInsideHouse(x, y) {
  return x >= 175 && x <= 645 && y >= 175 && y <= 712;
}

function countOtherActiveIndoorHumans(state, excludeId) {
  let count = 0;
  for (const other of state.humans) {
    if (other.id === excludeId || other.inCall) continue;
    if (isInsideHouse(other.x, other.y)) count++;
  }
  return count;
}

function selectNextIndoorWaypointIndex(waypoints) {
  for (let i = 0; i < waypoints.length; i++) {
    if (isInsideHouse(waypoints[i].x, waypoints[i].y) && waypoints[i].y < 500) {
      return i;
    }
  }
  return 0;
}

export function alertHumans(state, targetX, targetY, sourceName) {
  state.houseAlertTimer = 4.5;
  state.lastAlertSource = sourceName;
  const isCameraAlert = String(sourceName || '').startsWith('Câm');

  for (const h of state.humans) {
    if (isCameraAlert) {
      if (h.id === 'diego' && h.inCall) {
        h.inCall = false;
        h.callTimer = 0;
        h.callCooldown = 13.0;
        h.mode = 'patrol';
        h.statusLabel = 'Alerta da Câmera! 👀';
        h.speech = 'Alarme da câmera! Desligando a call!';
        h.speechTimer = 2.0;
      }
      if (h.id === 'stefanny' && h.mode === 'distracted') {
        h.mode = 'patrol';
        h.distractionTimer = 0;
        h.distractionCooldown = 10.0;
        h.waterActive = true;
        h.statusLabel = 'Rondando a Garagem 💦';
        h.speech = 'A câmera apitou! Foco total!';
        h.speechTimer = 2.0;
      }
      if (h.id === 'emily' && h.mode === 'pirouette') {
        h.mode = 'patrol';
        h.pirouetteDuration = 0;
        h.pirouetteTimer = 5.5;
        h.statusLabel = 'Patinando 🛼';
      }
      if (h.id === 'arthur' && h.mode === 'trick') {
        h.mode = 'patrol';
        h.trickTimer = 0;
        h.trickCooldown = 7.0;
        h.statusLabel = 'Skate no Quintal 🛹';
      }
      if (h.mode === 'cleaning_pee') {
        if (h.targetPee) {
          const idx = state.peePuddles.indexOf(h.targetPee);
          if (idx !== -1) state.peePuddles.splice(idx, 1);
          h.targetPee = null;
        }
        h.cleanTimer = 0;
        h.mode = 'patrol';
        if (h.id === 'stefanny') h.waterActive = true;
        if (h.id === 'bryan') h.isHumming = true;
        h.speech = 'A câmera apitou! Depois eu limpo!';
        h.speechTimer = 2.0;
      }
    }

    if (h.id === 'diego' && h.inCall) continue;
    if (h.id === 'stefanny' && h.mode === 'distracted') continue;
    if (h.mode === 'chase' || h.mode === 'screaming' || h.mode === 'reacting') continue;
    if (h.stayInYard && !isInYard(targetX, targetY)) continue;
    if (h.stayInGarage && !isInGarage(targetX, targetY)) continue;
    if (
      isInsideHouse(h.x, h.y) &&
      !isInsideHouse(targetX, targetY) &&
      countOtherActiveIndoorHumans(state, h.id) === 0
    ) {
      continue;
    }

    const dist = Math.hypot(h.x - targetX, h.y - targetY);
    if (dist <= 500) {
      h.mode = 'investigate';
      h.investigateTarget = { x: targetX, y: targetY, timer: 4.5 };
      h.speech = `O que foi isso?! (${sourceName})`;
      h.speechTimer = 2.0;
    }
  }
}

export function alertHumansInSameRoom(state, targetX, targetY, sourceName) {
  state.houseAlertTimer = 4.5;
  state.lastAlertSource = sourceName;
  const rooms = (state.map || MAP_CONFIG).rooms || [];
  const targetRooms = rooms.filter(
    (r) => targetX >= r.x && targetX <= r.x + r.w && targetY >= r.y && targetY <= r.y + r.h
  );

  for (const h of state.humans) {
    if (h.id === 'diego' && h.inCall) continue;
    if (h.id === 'stefanny' && h.mode === 'distracted') continue;
    if (h.mode === 'chase' || h.mode === 'screaming' || h.mode === 'reacting') continue;

    const inSameRoom = targetRooms.some(
      (r) => h.x >= r.x && h.x <= r.x + r.w && h.y >= r.y && h.y <= r.y + r.h
    );
    if (inSameRoom) {
      h.mode = 'investigate';
      h.investigateTarget = { x: targetX, y: targetY, timer: 4.5 };
      h.speech = `Eita! Que briga é essa?! (${sourceName})`;
      h.speechTimer = 2.0;
    }
  }
}

function moveToward(entity, targetX, targetY, speed, dt, state = null) {
  let tx = targetX;
  let ty = targetY;

  if (entity.stayInYard && !isInYard(tx, ty)) {
    if (entity.x < 160) {
      tx = Math.min(142, tx);
      ty = Math.min(704, ty);
    } else {
      ty = Math.min(142, ty);
    }
  }

  if (entity.stayInGarage) {
    tx = Math.max(36, Math.min(448, tx));
    ty = Math.max(752, Math.min(985, ty));
  }

  // Se este é o único humano ativo dentro de casa, não permite sair pelas portas externas
  if (
    state &&
    !entity.stayInYard &&
    !entity.stayInGarage &&
    isInsideHouse(entity.x, entity.y) &&
    !isInsideHouse(tx, ty) &&
    countOtherActiveIndoorHumans(state, entity.id) === 0
  ) {
    tx = Math.max(205, Math.min(620, tx));
    ty = Math.max(205, Math.min(685, ty));
  }

  const dx = tx - entity.x;
  const dy = ty - entity.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-3) return true;

  entity.angle = Math.atan2(dy, dx);
  const step = Math.min(dist, speed * dt);
  const nextX = entity.x + (dx / dist) * step;
  const nextY = entity.y + (dy / dist) * step;
  const resolved = resolveWallCollisions(nextX, nextY, entity.radius, MAP_CONFIG.walls);
  entity.x = resolved.x;
  entity.y = resolved.y;
  return dist <= step + 5;
}

function triggerStefannyDistraction(state, reasonSpeech) {
  const stefanny = state.humans.find((h) => h.id === 'stefanny');
  if (!stefanny) return;
  stefanny.mode = 'distracted';
  stefanny.distractionTimer = 4.5;
  stefanny.distractionCooldown = 10.5;
  stefanny.waterActive = false;
  stefanny.statusLabel = 'Distraída (TDAH/Filhos) 💭';
  stefanny.speech = reasonSpeech || 'Espera, o que eu vim fazer aqui mesmo?';
  stefanny.speechTimer = 4.2;
  state.soundEvents.push('distraction');
}

function applyWaterDamage(state) {
  const p = state.pacoca;
  if (p.invulnTimer > 0) return;
  p.hearts = Math.max(0, p.hearts - 1);
  p.invulnTimer = 1.2;
  p.slowTimer = 0.8;
  state.soundEvents.push('splash');
  if (p.hearts <= 0) {
    state.status = 'soaked';
  }
}

function advancePatrolWaypoint(h, state, dt) {
  let wp = h.waypoints[h.waypointIndex];
  if (
    !h.stayInYard &&
    !h.stayInGarage &&
    isInsideHouse(h.x, h.y) &&
    !isInsideHouse(wp.x, wp.y) &&
    countOtherActiveIndoorHumans(state, h.id) === 0
  ) {
    h.waypointIndex = selectNextIndoorWaypointIndex(h.waypoints);
    wp = h.waypoints[h.waypointIndex];
  }
  if (moveToward(h, wp.x, wp.y, BASE_SPEED * h.patrolMultiplier, dt, state)) {
    h.waypointIndex = (h.waypointIndex + 1) % h.waypoints.length;
  }
}

function handleReactionPhase(h, canSeePacoca, dt, onReactionComplete) {
  if (
    (h.mode === 'patrol' || h.mode === 'investigate' || h.mode === 'pirouette') &&
    canSeePacoca
  ) {
    if (h.stayInYard && !isInYard(h.x, h.y)) return false;
    h.mode = 'reacting';
    h.reactionTimer = h.reactionDelay;
    h.speech = 'Ué... é o Paçoca?! 😮';
    h.speechTimer = h.reactionDelay;
  }

  if (h.mode === 'reacting') {
    h.statusLabel = `Percebendo (${h.reactionTimer.toFixed(1)}s)... 😮`;
    h.reactionTimer -= dt;
    if (h.reactionTimer <= 0) {
      const remDt = Math.max(0, -h.reactionTimer);
      onReactionComplete(remDt);
    }
    return true;
  }
  return false;
}

export function stepGame(state, input, dt) {
  if (state.status !== 'playing') return state;

  state.time += dt;
  state.soundEvents = [];

  if (state.houseAlertTimer > 0) {
    state.houseAlertTimer = Math.max(0, state.houseAlertTimer - dt);
  }

  // 1. Update Paçoca
  const p = state.pacoca;
  if (p.invulnTimer > 0) p.invulnTimer = Math.max(0, p.invulnTimer - dt);
  if (p.slowTimer > 0) p.slowTimer = Math.max(0, p.slowTimer - dt);
  if (p.fightTimer > 0) p.fightTimer = Math.max(0, p.fightTimer - dt);
  if (p.peeCooldown > 0) p.peeCooldown = Math.max(0, p.peeCooldown - dt);
  if (p.peeingTimer > 0) p.peeingTimer = Math.max(0, p.peeingTimer - dt);

  if (input?.pee && p.peeCooldown <= 0) {
    const watchedByAnyHuman = state.humans.some((h) => {
      if (h.id === 'diego' && h.inCall) return false;
      if (h.id === 'stefanny' && h.mode === 'distracted') return false;
      if (h.mode === 'cleaning_pee') return false;
      return isPointInCone(
        p.x,
        p.y,
        h.x,
        h.y,
        h.angle,
        h.fov,
        h.visionRange,
        MAP_CONFIG.walls
      );
    });

    if (!watchedByAnyHuman) {
      state.peePuddles.push({
        id: `pee_${state.time.toFixed(3)}_${state.peePuddles.length}`,
        x: p.x,
        y: p.y,
        radius: 14,
        cleanerId: null,
      });
      p.peeCooldown = p.peeMaxCooldown;
      p.peeingTimer = 0.45;
      state.soundEvents.push('pee');
    } else {
      state.soundEvents.push('pee_blocked');
    }
  }

  const rawDx = Number(input?.dx || 0);
  const rawDy = Number(input?.dy || 0);
  const mag = Math.hypot(rawDx, rawDy);
  if (mag > 1e-4 && !(p.fightTimer > 0)) {
    const nx = rawDx / mag;
    const ny = rawDy / mag;
    const speedFactor = p.slowTimer > 0 ? 0.65 : 1.0;
    const step = BASE_SPEED * speedFactor * Math.min(1, mag) * dt;
    const nextPos = resolveWallCollisions(
      p.x + nx * step,
      p.y + ny * step,
      p.radius,
      MAP_CONFIG.walls
    );
    p.x = nextPos.x;
    p.y = nextPos.y;
    p.angle = Math.atan2(ny, nx);
    p.isMoving = true;
    p.furShakePhase += dt * 14;
  } else {
    p.isMoving = false;
  }

  const exitGate = (state.map || MAP_CONFIG).exitGate;
  if (circleIntersectsRect(p.x, p.y, p.radius, exitGate)) {
    state.status = 'won';
    state.escapeTime = Math.max(0.01, Number(state.time.toFixed(2)));
    state.recordSummary = recordEscapeWin(
      state.escapeTime,
      state.map?.layoutId,
      undefined,
      state.status
    );
    state.soundEvents.push('win');
    return state;
  }

  const q1Room = (state.map || MAP_CONFIG).rooms.find((r) => r.id === 'quarto_1');
  const pacocaInStartSafeRoom =
    q1Room && p.x > q1Room.x + 12 && p.y >= q1Room.y && p.y <= q1Room.y + q1Room.h;

  // 1b. Update Dogs: Spike fica parado com raio circular de domínio; Meggie anda pela casa
  if (state.spike) {
    const spike = state.spike;
    if (spike.speechTimer > 0) {
      spike.speechTimer = Math.max(0, spike.speechTimer - dt);
      if (spike.speechTimer === 0) spike.speech = '';
    }
    if (spike.fightCooldown > 0) {
      spike.fightCooldown = Math.max(0, spike.fightCooldown - dt);
    }

    const domainR = spike.domainRadius || MEGGIE_VISION_RANGE;
    const distToSpike = Math.hypot(p.x - spike.x, p.y - spike.y);
    const inSpikeDomain =
      distToSpike <= domainR &&
      hasLineOfSight(spike.x, spike.y, p.x, p.y, MAP_CONFIG.walls);

    if (!pacocaInStartSafeRoom && spike.fightCooldown <= 0 && inSpikeDomain) {
      spike.mode = 'fighting';
      spike.isLyingDown = false;
      spike.fightTimer = 0.5;
      spike.fightCooldown = 3.0;
      spike.statusLabel = 'Brigando na Área de Domínio! 💢';
      spike.speech = 'GRRR! AU! 💢';
      spike.speechTimer = 1.4;
      p.fightTimer = 0.5;
      p.isMoving = false;
      applyWaterDamage(state);
      state.soundEvents.push('dog_fight');
      alertHumansInSameRoom(state, spike.x, spike.y, 'Briga com o Spike');
      if (state.status !== 'playing') return state;
    } else if (spike.mode === 'fighting') {
      spike.fightTimer -= dt;
      if (spike.fightTimer <= 0) {
        spike.mode = 'sleeping';
        spike.isLyingDown = true;
        spike.statusLabel = 'Parado (Área de Domínio) 💤';
      }
    } else {
      spike.mode = 'sleeping';
      spike.isLyingDown = true;
      spike.statusLabel = 'Parado (Área de Domínio) 💤';
    }
  }

  if (state.meggie) {
    const meggie = state.meggie;
    if (meggie.speechTimer > 0) {
      meggie.speechTimer = Math.max(0, meggie.speechTimer - dt);
      if (meggie.speechTimer === 0) meggie.speech = '';
    }
    if (meggie.barkCooldown > 0) {
      meggie.barkCooldown = Math.max(0, meggie.barkCooldown - dt);
    }

    const meggieSeesPacoca =
      !pacocaInStartSafeRoom &&
      (isPointInCone(
        p.x,
        p.y,
        meggie.x,
        meggie.y,
        meggie.angle,
        meggie.fov,
        meggie.visionRange,
        MAP_CONFIG.walls
      ) ||
        Math.hypot(p.x - meggie.x, p.y - meggie.y) <= meggie.radius + p.radius + 6);

    if (meggieSeesPacoca && meggie.barkCooldown <= 0) {
      meggie.mode = 'barking';
      meggie.barkTimer = 1.0;
      meggie.barkCooldown = 3.5;
      meggie.statusLabel = 'Latindo! (Au au!) 📢';
      meggie.speech = 'AU AU AU! 🐾📢';
      meggie.speechTimer = 1.8;
      state.soundEvents.push('dog_bark');
      alertHumans(state, p.x, p.y, 'Latido da Meggie');
    } else if (meggie.mode === 'barking') {
      meggie.barkTimer -= dt;
      if (meggie.barkTimer <= 0) {
        meggie.mode = 'patrol';
        meggie.statusLabel = 'Andando pela casa 🐾';
      }
    } else {
      meggie.statusLabel = 'Andando pela casa 🐾';
      const wp = meggie.waypoints[meggie.waypointIndex];
      if (moveToward(meggie, wp.x, wp.y, BASE_SPEED * meggie.patrolMultiplier, dt)) {
        meggie.waypointIndex = (meggie.waypointIndex + 1) % meggie.waypoints.length;
      }
    }
  }

  // 2. Update Security Cameras (Esquinas dos Quintais)
  for (const cam of state.cameras) {
    cam.angle = cam.baseAngle + Math.sin(state.time * cam.sweepSpeed) * cam.sweepAngle;
    if (cam.alertCooldown > 0) {
      cam.alertCooldown = Math.max(0, cam.alertCooldown - dt);
    }

    const seesPacoca = isPointInCone(
      p.x,
      p.y,
      cam.x,
      cam.y,
      cam.angle,
      cam.fov,
      cam.range,
      MAP_CONFIG.walls
    );

    if (seesPacoca) {
      cam.exposure += dt;
      if (cam.exposure >= 0.35) {
        cam.alerted = true;
        if (cam.alertCooldown <= 0) {
          cam.alertCooldown = 3.0;
          state.soundEvents.push('camera_beep');
          alertHumans(state, p.x, p.y, cam.label);
        }
      }
    } else {
      cam.exposure = Math.max(0, cam.exposure - dt * 1.5);
      if (cam.exposure === 0 && cam.alertCooldown === 0) {
        cam.alerted = false;
      }
    }
  }

  // 3. Update Water Puddles
  for (let i = state.puddles.length - 1; i >= 0; i--) {
    const puddle = state.puddles[i];
    puddle.ttl -= dt;
    if (puddle.ttl <= 0) {
      state.puddles.splice(i, 1);
      continue;
    }
    const dist = Math.hypot(p.x - puddle.x, p.y - puddle.y);
    if (dist < p.radius + puddle.radius) {
      applyWaterDamage(state);
      if (state.status !== 'playing') return state;
    }
  }

  // 4. Update each of the 5 Humans
  const DiegoPhrases = [
    'Hmm, preciso revisar aquele deploy...',
    'Será que tranquei o portão?',
    'Cadê meu café?',
    'Hoje tem reunião às 19h...',
  ];

  for (const h of state.humans) {
    if (h.speechTimer > 0) {
      h.speechTimer = Math.max(0, h.speechTimer - dt);
      if (h.speechTimer === 0 && h.id !== 'bryan') {
        h.speech = '';
      }
    }

    // Check if human is currently cleaning a pee puddle or spots a new pee puddle in their vision cone
    if (!(h.id === 'diego' && h.inCall)) {
      if (h.mode === 'cleaning_pee' && h.targetPee) {
        if (h.id === 'stefanny') h.waterActive = false;
        if (h.id === 'bryan') h.isHumming = false;
        const reachedPee = moveToward(
          h,
          h.targetPee.x,
          h.targetPee.y,
          BASE_SPEED * 0.85,
          dt,
          state
        );
        if (reachedPee || Math.hypot(h.x - h.targetPee.x, h.y - h.targetPee.y) <= 18) {
          h.cleanTimer -= dt;
          h.statusLabel = `Limpando Xixi (${Math.ceil(Math.max(0, h.cleanTimer))}s) 🧻`;
          if (h.cleanTimer <= 0) {
            const idx = state.peePuddles.indexOf(h.targetPee);
            if (idx !== -1) state.peePuddles.splice(idx, 1);
            h.targetPee = null;
            h.mode = 'patrol';
            if (h.id === 'stefanny') h.waterActive = true;
            if (h.id === 'bryan') h.isHumming = true;
            h.speech = 'Pronto, xixi limpo! 🧼';
            h.speechTimer = 1.8;
          }
        } else {
          h.statusLabel = 'Indo limpar xixi! 🧻';
        }
        continue;
      }

      const visiblePee = state.peePuddles.find((pee) => {
        if (pee.cleanerId) return false;
        if (h.stayInYard && !isInYard(pee.x, pee.y)) return false;
        if (h.stayInGarage && !isInGarage(pee.x, pee.y)) return false;
        if (
          isInsideHouse(h.x, h.y) &&
          !isInsideHouse(pee.x, pee.y) &&
          countOtherActiveIndoorHumans(state, h.id) === 0
        ) {
          return false;
        }
        return isPointInCone(
          pee.x,
          pee.y,
          h.x,
          h.y,
          h.angle,
          h.fov,
          h.visionRange,
          MAP_CONFIG.walls
        );
      });

      if (visiblePee) {
        visiblePee.cleanerId = h.id;
        h.mode = 'cleaning_pee';
        h.targetPee = visiblePee;
        h.cleanTimer = 3.0;
        if (h.id === 'stefanny') h.waterActive = false;
        if (h.id === 'bryan') h.isHumming = false;
        h.statusLabel = 'Indo limpar xixi! 🧻';
        h.speech = 'EITA! O Paçoca fez xixi aqui! Vou limpar! 🧻';
        h.speechTimer = 3.0;
        state.soundEvents.push('distraction');
        continue;
      }
    }

    const q1 = (state.map || MAP_CONFIG).rooms.find((r) => r.id === 'quarto_1');
    const pacocaInStartSafeRoom =
      q1 && p.x > q1.x + 12 && p.y >= q1.y && p.y <= q1.y + q1.h;
    const canSeePacoca =
      !pacocaInStartSafeRoom &&
      isPointInCone(
        p.x,
        p.y,
        h.x,
        h.y,
        h.angle,
        h.fov,
        h.visionRange,
        MAP_CONFIG.walls
      );
    const directLOS = hasLineOfSight(h.x, h.y, p.x, p.y, MAP_CONFIG.walls);

    // --- HUMAN 1: EMILY (Irmã - Reação 1.3s > Crianças > Adultos, Grito + Patins/Balé) ---
    if (h.id === 'emily') {
      if (
        handleReactionPhase(h, canSeePacoca, dt, () => {
          h.mode = 'screaming';
          h.screamTimer = 0.7;
          h.statusLabel = 'GRITANDO! 📢';
          h.speech = 'MÃEEE! PAI! O PAÇOCA TÁ FUGINDO!';
          h.speechTimer = 2.2;
          state.soundEvents.push('emily_scream');
          alertHumans(state, p.x, p.y, 'Grito da Emily');
        })
      ) {
        // Handled in reacting phase
      } else if (h.mode === 'screaming') {
        h.screamTimer -= dt;
        if (h.screamTimer <= 0) {
          const remDt = Math.max(0.016, -h.screamTimer);
          h.mode = 'chase';
          h.lostSightTimer = 0;
          h.statusLabel = 'Correndo atrás! 🛼';
          moveToward(h, p.x, p.y, BASE_SPEED * h.chaseMultiplier, remDt);
        }
      } else if (h.mode === 'chase') {
        h.statusLabel = 'Correndo atrás! 🛼';
        moveToward(h, p.x, p.y, BASE_SPEED * h.chaseMultiplier, dt);
        if (!directLOS) {
          h.lostSightTimer += dt;
          if (h.lostSightTimer >= 2.8) {
            h.mode = 'patrol';
            h.statusLabel = 'Patinando 🛼';
          }
        } else {
          h.lostSightTimer = 0;
        }
      } else if (h.mode === 'pirouette') {
        h.statusLabel = 'Pirueta de Balé 🩰';
        h.angle += dt * Math.PI * 3.2;
        h.pirouetteDuration -= dt;
        if (h.pirouetteDuration <= 0) {
          h.mode = 'patrol';
          h.pirouetteTimer = 5.5;
          h.statusLabel = 'Patinando 🛼';
        }
      } else {
        h.pirouetteTimer -= dt;
        if (h.pirouetteTimer <= 0 && h.mode === 'patrol') {
          h.mode = 'pirouette';
          h.pirouetteDuration = 1.4;
          h.speech = 'Olha minha pirueta! 🩰';
          h.speechTimer = 1.4;
        } else if (h.mode === 'investigate' && h.investigateTarget) {
          h.statusLabel = 'Olhando barulho 👀';
          const reached = moveToward(
            h,
            h.investigateTarget.x,
            h.investigateTarget.y,
            BASE_SPEED * h.patrolMultiplier,
            dt
          );
          h.investigateTarget.timer -= dt;
          if (reached || h.investigateTarget.timer <= 0) {
            h.mode = 'patrol';
            h.statusLabel = 'Patinando 🛼';
          }
        } else {
          h.statusLabel = 'Patinando 🛼';
          advancePatrolWaypoint(h, state, dt);
        }
      }
    }

    // --- HUMAN 2: DIEGO (Pai / Reação Adulto 0.4s / Mesma velocidade / Call do Trabalho) ---
    else if (h.id === 'diego') {
      if (h.inCall) {
        h.callTimer -= dt;
        h.statusLabel = `Em Call (${Math.ceil(h.callTimer)}s) 📞`;
        if (h.callTimer <= 0) {
          h.inCall = false;
          h.callCooldown = 13.0;
          h.mode = 'patrol';
          h.statusLabel = 'Falando sozinho 💭';
          h.speech = 'Voltei da call! Onde eu tava?';
          h.speechTimer = 2.5;
        }
        continue;
      }

      h.callCooldown -= dt;
      if (h.callCooldown <= 0) {
        // Só entra em call se houver ao menos outro humano ativo dentro de casa
        if (isInsideHouse(h.x, h.y) && countOtherActiveIndoorHumans(state, h.id) === 0) {
          h.callCooldown = 1.5;
        } else {
          h.inCall = true;
          h.callTimer = 5.0;
          h.mode = 'patrol';
          h.statusLabel = 'Em Call (5s) 📞';
          h.speech = 'Opa, me chamaram no trabalho! Só 1 min... 📞';
          h.speechTimer = 4.5;
          state.soundEvents.push('work_call');
          continue;
        }
      }

      if (
        handleReactionPhase(h, canSeePacoca, dt, (remDt) => {
          h.mode = 'chase';
          h.lostSightTimer = 0;
          h.statusLabel = 'Correndo atrás! 🏃‍♂️';
          h.speech = 'PAÇOCA! Volta já pra dentro!';
          h.speechTimer = 2.0;
          if (remDt > 0) moveToward(h, p.x, p.y, BASE_SPEED * h.chaseMultiplier, remDt, state);
        })
      ) {
        // Reacting
      } else if (h.mode === 'chase') {
        moveToward(h, p.x, p.y, BASE_SPEED * h.chaseMultiplier, dt, state);
        if (!directLOS) {
          h.lostSightTimer += dt;
          if (h.lostSightTimer >= 2.6) {
            h.mode = 'patrol';
            h.statusLabel = 'Falando sozinho 💭';
          }
        } else {
          h.lostSightTimer = 0;
        }
      } else if (h.mode === 'investigate' && h.investigateTarget) {
        h.statusLabel = 'Verificando 👀';
        const reached = moveToward(
          h,
          h.investigateTarget.x,
          h.investigateTarget.y,
          BASE_SPEED * 0.8,
          dt,
          state
        );
        h.investigateTarget.timer -= dt;
        if (reached || h.investigateTarget.timer <= 0) {
          h.mode = 'patrol';
          h.statusLabel = 'Falando sozinho 💭';
        }
      } else {
        h.statusLabel = 'Falando sozinho 💭';
        if (h.speechTimer <= 0) {
          const idx = Math.floor(state.time / 4) % DiegoPhrases.length;
          h.speech = DiegoPhrases[idx];
          h.speechTimer = 3.2;
        }
        advancePatrolWaypoint(h, state, dt);
      }
    }

    // --- HUMAN 3: STÉFANNY (Mãe / Reação Adulta 0.4s / Sempre na Garagem / Água + TDAH) ---
    else if (h.id === 'stefanny') {
      if (h.mode === 'distracted') {
        h.waterActive = false;
        h.distractionTimer -= dt;
        h.statusLabel = `Distraída (${Math.ceil(h.distractionTimer)}s) 💭`;
        if (h.distractionTimer <= 0) {
          h.mode = 'patrol';
          h.waterActive = true;
          h.distractionCooldown = 10.0;
          h.statusLabel = 'Rondando a Garagem 💦';
          h.speech = 'Ah lembrei! Lavar a garagem!';
          h.speechTimer = 2.0;
        }
      } else {
        h.distractionCooldown -= dt;
        if (h.distractionCooldown <= 0) {
          triggerStefannyDistraction(state, 'Espera... o que eu vim fazer aqui mesmo? 🤔');
        } else {
          h.waterActive = true;

          h.puddleSpawnTimer -= dt;
          if (h.puddleSpawnTimer <= 0) {
            h.puddleSpawnTimer = 1.6;
            const rawPx = h.x + Math.cos(h.angle) * 48;
            const rawPy = h.y + Math.sin(h.angle) * 48;
            const safePuddle = resolveWallCollisions(rawPx, rawPy, 20, MAP_CONFIG.walls);
            if (state.puddles.length < 6) {
              state.puddles.push({ x: safePuddle.x, y: safePuddle.y, radius: 22, ttl: 5.5 });
            }
          }

          if (
            isPointInCone(
              p.x,
              p.y,
              h.x,
              h.y,
              h.angle,
              0.45,
              h.waterRange,
              MAP_CONFIG.walls
            )
          ) {
            applyWaterDamage(state);
            if (state.status !== 'playing') return state;
          }

          if (
            handleReactionPhase(h, canSeePacoca, dt, (remDt) => {
              h.mode = 'chase';
              h.lostSightTimer = 0;
              h.statusLabel = 'Boss: Pegando Paçoca! ⚡';
              h.speech = 'PAÇOCA NÃO! Acabei de lavar a garagem!';
              h.speechTimer = 2.0;
              if (remDt > 0) moveToward(h, p.x, p.y, BASE_SPEED * h.chaseMultiplier, remDt, state);
            })
          ) {
            // Reacting
          } else if (h.mode === 'chase') {
            moveToward(h, p.x, p.y, BASE_SPEED * h.chaseMultiplier, dt, state);
            if (!directLOS || !isInGarage(p.x, p.y)) {
              h.lostSightTimer += dt;
              if (h.lostSightTimer >= 2.0) {
                h.mode = 'patrol';
                h.statusLabel = 'Rondando a Garagem 💦';
              }
            } else {
              h.lostSightTimer = 0;
            }
          } else if (h.mode === 'investigate' && h.investigateTarget) {
            h.statusLabel = 'Indo olhar 👀';
            const reached = moveToward(
              h,
              h.investigateTarget.x,
              h.investigateTarget.y,
              BASE_SPEED * 0.9,
              dt,
              state
            );
            h.investigateTarget.timer -= dt;
            if (reached || h.investigateTarget.timer <= 0) {
              h.mode = 'patrol';
              h.statusLabel = 'Rondando a Garagem 💦';
            }
          } else {
            h.statusLabel = 'Rondando a Garagem 💦';
            advancePatrolWaypoint(h, state, dt);
          }
        }
      }
    }

    // --- HUMAN 4: BRYAN (Irmão - Reação 0.8s / Anda por toda a casa e quintal cantarolando) ---
    else if (h.id === 'bryan') {
      h.notePhase += dt * 4;
      h.callMomCooldown -= dt;
      if (h.callMomCooldown <= 0 && h.mode === 'patrol') {
        h.callMomCooldown = 14.0;
        h.speech = 'MÃEEE! Onde tá meu brinquedo?!';
        h.speechTimer = 2.2;
        triggerStefannyDistraction(state, 'Já vou, Bryan! Onde eu deixei aquilo? 💭');
      }

      if (
        handleReactionPhase(h, canSeePacoca, dt, (remDt) => {
          h.mode = 'chase';
          h.isHumming = false;
          h.lostSightTimer = 0;
          h.statusLabel = 'Correndo atrás! 🏃';
          h.speech = 'Peguei você, Paçoca!';
          h.speechTimer = 1.8;
          if (remDt > 0) moveToward(h, p.x, p.y, BASE_SPEED * h.chaseMultiplier, remDt, state);
        })
      ) {
        h.isHumming = false;
      } else if (h.mode === 'chase') {
        h.isHumming = false;
        moveToward(h, p.x, p.y, BASE_SPEED * h.chaseMultiplier, dt, state);
        if (!directLOS) {
          h.lostSightTimer += dt;
          if (h.lostSightTimer >= 2.4) {
            h.mode = 'patrol';
            h.isHumming = true;
            h.statusLabel = 'Cantarolando 🎵';
            h.speech = '♪ ♫ ♪';
          }
        } else {
          h.lostSightTimer = 0;
        }
      } else if (h.mode === 'investigate' && h.investigateTarget) {
        h.isHumming = false;
        h.statusLabel = 'Procurando Paçoca 👀';
        const reached = moveToward(
          h,
          h.investigateTarget.x,
          h.investigateTarget.y,
          BASE_SPEED * 0.85,
          dt,
          state
        );
        h.investigateTarget.timer -= dt;
        if (reached || h.investigateTarget.timer <= 0) {
          h.mode = 'patrol';
          h.isHumming = true;
          h.statusLabel = 'Cantarolando 🎵';
          h.speech = '♪ ♫ ♪';
        }
      } else {
        h.isHumming = true;
        h.statusLabel = 'Cantarolando 🎵';
        if (!h.speech) h.speech = '♪ ♫ ♪';
        advancePatrolWaypoint(h, state, dt);
      }
    }

    // --- HUMAN 5: ARTHUR (Irmão - Reação 0.8s / Sempre no Quintal de Skate / Distrai fácil) ---
    else if (h.id === 'arthur') {
      if (h.mode === 'trick') {
        h.trickTimer -= dt;
        h.angle += dt * Math.PI * 4;
        h.statusLabel = 'Manobra de Skate! 🛹';
        if (h.trickTimer <= 0) {
          h.mode = 'patrol';
          h.trickCooldown = 7.0;
          h.statusLabel = 'Skate no Quintal 🛹';
        }
      } else {
        h.trickCooldown -= dt;
        if (h.trickCooldown <= 0) {
          h.mode = 'trick';
          h.trickTimer = 1.6;
          h.speech = 'Olha esse flip no skate! 🛹✨';
          h.speechTimer = 1.6;
        } else if (
          handleReactionPhase(h, canSeePacoca, dt, (remDt) => {
            h.mode = 'chase';
            h.lostSightTimer = 0;
            h.statusLabel = 'No Skate atrás! 🛹💨';
            h.speech = 'Bora pegar o Paçoca de skate!';
            h.speechTimer = 1.5;
            if (remDt > 0) moveToward(h, p.x, p.y, BASE_SPEED * h.chaseMultiplier, remDt);
          })
        ) {
          // Reacting
        } else if (h.mode === 'chase') {
          moveToward(h, p.x, p.y, BASE_SPEED * h.chaseMultiplier, dt);
          if (!directLOS || !isInYard(p.x, p.y)) {
            h.lostSightTimer += dt;
            if (h.lostSightTimer >= 1.2) {
              h.mode = 'patrol';
              h.statusLabel = 'Distraído no Skate 🛹';
              h.speech = 'Ué, cadê ele? Vou andar de skate!';
              h.speechTimer = 1.8;
            }
          } else {
            h.lostSightTimer = 0;
          }
        } else if (h.mode === 'investigate' && h.investigateTarget) {
          h.statusLabel = 'Indo de Skate 🛹';
          const reached = moveToward(
            h,
            h.investigateTarget.x,
            h.investigateTarget.y,
            BASE_SPEED * h.patrolMultiplier,
            dt
          );
          h.investigateTarget.timer -= dt;
          if (reached || h.investigateTarget.timer <= 0) {
            h.mode = 'patrol';
            h.statusLabel = 'Skate no Quintal 🛹';
          }
        } else {
          h.statusLabel = 'Skate no Quintal 🛹';
          const wp = h.waypoints[h.waypointIndex];
          if (moveToward(h, wp.x, wp.y, BASE_SPEED * h.patrolMultiplier, dt)) {
            h.waypointIndex = (h.waypointIndex + 1) % h.waypoints.length;
          }
        }
      }
    }

    const distToPacoca = Math.hypot(h.x - p.x, h.y - p.y);
    if (distToPacoca < h.radius + p.radius - 2) {
      state.status = 'captured';
      state.capturedBy = h;
      state.soundEvents.push('captured');
      return state;
    }
  }

  return state;
}
