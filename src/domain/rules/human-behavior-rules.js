/**
 * Estratégias Comportamentais dos 5 Humanos da Família (Single Responsibility + Open/Closed Principle).
 * Cada personagem possui sua própria função coesa de atualização de estado, evitando condicionais monolíticas.
 */
import {
  BASE_SPEED,
  EstadoDaPartida,
  ModoDoHumano,
  EventoSonoro,
} from '../ubiquitous-language.js';
import {
  hasLineOfSight,
  isPointInCone,
  resolveWallCollisions,
} from '../geometry/spatial-vision.js';
import { MAP_CONFIG } from '../house/house-layout-generator.js';
import {
  isInYard,
  isInGarage,
  isInsideHouse,
  countOtherActiveIndoorHumans,
  moveEntityToward,
  advanceHumanPatrolWaypoint,
} from './house-zones.js';
import {
  alertHumans,
  applyWaterDamage,
  triggerStefannyDistraction,
  updateHumanPeeCleaning,
} from './stealth-and-pee-rules.js';

const DIEGO_MONOLOGUE_PHRASES = [
  'Hmm, preciso revisar aquele deploy...',
  'Será que tranquei o portão?',
  'Cadê meu café?',
  'Hoje tem reunião às 19h...',
];

function handleHumanReactionPhase(human, canSeePacoca, dt, onReactionComplete) {
  if (
    (human.mode === ModoDoHumano.PATRULHA ||
      human.mode === ModoDoHumano.INVESTIGACAO ||
      human.mode === ModoDoHumano.PIRUETA_DE_BALE) &&
    canSeePacoca
  ) {
    if (human.stayInYard && !isInYard(human.x, human.y)) return false;
    human.mode = ModoDoHumano.REAGINDO;
    human.reactionTimer = human.reactionDelay;
    human.speech = 'Ué... é o Paçoca?! 😮';
    human.speechTimer = human.reactionDelay;
  }

  if (human.mode === ModoDoHumano.REAGINDO) {
    human.statusLabel = `Percebendo (${human.reactionTimer.toFixed(1)}s)... 😮`;
    human.reactionTimer -= dt;
    if (human.reactionTimer <= 0) {
      const remainingDt = Math.max(0, -human.reactionTimer);
      onReactionComplete(remainingDt);
    }
    return true;
  }
  return false;
}

function updateEmilyBehavior(human, state, dt, canSeePacoca, directLineOfSight) {
  const pacoca = state.pacoca;
  if (
    handleHumanReactionPhase(human, canSeePacoca, dt, () => {
      human.mode = ModoDoHumano.GRITANDO;
      human.screamTimer = 0.7;
      human.statusLabel = 'GRITANDO! 📢';
      human.speech = 'MÃEEE! PAI! O PAÇOCA TÁ FUGINDO!';
      human.speechTimer = 2.2;
      state.soundEvents.push(EventoSonoro.GRITO_EMILY);
      alertHumans(state, pacoca.x, pacoca.y, 'Grito da Emily');
    })
  ) {
    return;
  }

  if (human.mode === ModoDoHumano.GRITANDO) {
    human.screamTimer -= dt;
    if (human.screamTimer <= 0) {
      const remainingDt = Math.max(0.016, -human.screamTimer);
      human.mode = ModoDoHumano.PERSEGUICAO;
      human.lostSightTimer = 0;
      human.statusLabel = 'Correndo atrás! 🛼';
      moveEntityToward(human, pacoca.x, pacoca.y, BASE_SPEED * human.chaseMultiplier, remainingDt);
    }
  } else if (human.mode === ModoDoHumano.PERSEGUICAO) {
    human.statusLabel = 'Correndo atrás! 🛼';
    moveEntityToward(human, pacoca.x, pacoca.y, BASE_SPEED * human.chaseMultiplier, dt);
    if (!directLineOfSight) {
      human.lostSightTimer += dt;
      if (human.lostSightTimer >= 2.8) {
        human.mode = ModoDoHumano.PATRULHA;
        human.statusLabel = 'Patinando 🛼';
      }
    } else {
      human.lostSightTimer = 0;
    }
  } else if (human.mode === ModoDoHumano.PIRUETA_DE_BALE) {
    human.statusLabel = 'Pirueta de Balé 🩰';
    human.angle += dt * Math.PI * 3.2;
    human.pirouetteDuration -= dt;
    if (human.pirouetteDuration <= 0) {
      human.mode = ModoDoHumano.PATRULHA;
      human.pirouetteTimer = 5.5;
      human.statusLabel = 'Patinando 🛼';
    }
  } else {
    human.pirouetteTimer -= dt;
    if (human.pirouetteTimer <= 0 && human.mode === ModoDoHumano.PATRULHA) {
      human.mode = ModoDoHumano.PIRUETA_DE_BALE;
      human.pirouetteDuration = 1.4;
      human.speech = 'Olha minha pirueta! 🩰';
      human.speechTimer = 1.4;
    } else if (human.mode === ModoDoHumano.INVESTIGACAO && human.investigateTarget) {
      human.statusLabel = 'Olhando barulho 👀';
      const reached = moveEntityToward(
        human,
        human.investigateTarget.x,
        human.investigateTarget.y,
        BASE_SPEED * human.patrolMultiplier,
        dt
      );
      human.investigateTarget.timer -= dt;
      if (reached || human.investigateTarget.timer <= 0) {
        human.mode = ModoDoHumano.PATRULHA;
        human.statusLabel = 'Patinando 🛼';
      }
    } else {
      human.statusLabel = 'Patinando 🛼';
      advanceHumanPatrolWaypoint(human, state, dt);
    }
  }
}

function updateDiegoBehavior(human, state, dt, canSeePacoca, directLineOfSight) {
  const pacoca = state.pacoca;
  if (human.inCall) {
    human.callTimer -= dt;
    human.statusLabel = `Em Call (${Math.ceil(human.callTimer)}s) 📞`;
    if (human.callTimer <= 0) {
      human.inCall = false;
      human.callCooldown = 13.0;
      human.mode = ModoDoHumano.PATRULHA;
      human.statusLabel = 'Falando sozinho 💭';
      human.speech = 'Voltei da call! Onde eu tava?';
      human.speechTimer = 2.5;
    }
    return false;
  }

  human.callCooldown -= dt;
  if (human.callCooldown <= 0) {
    if (isInsideHouse(human.x, human.y) && countOtherActiveIndoorHumans(state, human.id) === 0) {
      human.callCooldown = 1.5;
    } else {
      human.inCall = true;
      human.callTimer = 5.0;
      human.mode = ModoDoHumano.PATRULHA;
      human.statusLabel = 'Em Call (5s) 📞';
      human.speech = 'Opa, me chamaram no trabalho! Só 1 min... 📞';
      human.speechTimer = 4.5;
      state.soundEvents.push(EventoSonoro.CALL_TRABALHO);
      return false;
    }
  }

  if (
    handleHumanReactionPhase(human, canSeePacoca, dt, (remainingDt) => {
      human.mode = ModoDoHumano.PERSEGUICAO;
      human.lostSightTimer = 0;
      human.statusLabel = 'Correndo atrás! 🏃‍♂️';
      human.speech = 'PAÇOCA! Volta já pra dentro!';
      human.speechTimer = 2.0;
      if (remainingDt > 0) {
        moveEntityToward(
          human,
          pacoca.x,
          pacoca.y,
          BASE_SPEED * human.chaseMultiplier,
          remainingDt,
          state
        );
      }
    })
  ) {
    return true;
  }

  if (human.mode === ModoDoHumano.PERSEGUICAO) {
    moveEntityToward(human, pacoca.x, pacoca.y, BASE_SPEED * human.chaseMultiplier, dt, state);
    if (!directLineOfSight) {
      human.lostSightTimer += dt;
      if (human.lostSightTimer >= 2.6) {
        human.mode = ModoDoHumano.PATRULHA;
        human.statusLabel = 'Falando sozinho 💭';
      }
    } else {
      human.lostSightTimer = 0;
    }
  } else if (human.mode === ModoDoHumano.INVESTIGACAO && human.investigateTarget) {
    human.statusLabel = 'Verificando 👀';
    const reached = moveEntityToward(
      human,
      human.investigateTarget.x,
      human.investigateTarget.y,
      BASE_SPEED * 0.8,
      dt,
      state
    );
    human.investigateTarget.timer -= dt;
    if (reached || human.investigateTarget.timer <= 0) {
      human.mode = ModoDoHumano.PATRULHA;
      human.statusLabel = 'Falando sozinho 💭';
    }
  } else {
    human.statusLabel = 'Falando sozinho 💭';
    if (human.speechTimer <= 0) {
      const phraseIndex = Math.floor(state.time / 4) % DIEGO_MONOLOGUE_PHRASES.length;
      human.speech = DIEGO_MONOLOGUE_PHRASES[phraseIndex];
      human.speechTimer = 3.2;
    }
    advanceHumanPatrolWaypoint(human, state, dt);
  }
  return true;
}

function updateStefannyBehavior(human, state, dt, canSeePacoca, directLineOfSight) {
  const pacoca = state.pacoca;
  const walls = (state.map || MAP_CONFIG).walls;

  if (human.mode === ModoDoHumano.DISTRAIDA) {
    human.waterActive = false;
    human.distractionTimer -= dt;
    human.statusLabel = `Distraída (${Math.ceil(human.distractionTimer)}s) 💭`;
    if (human.distractionTimer <= 0) {
      human.mode = ModoDoHumano.PATRULHA;
      human.waterActive = true;
      human.distractionCooldown = 10.0;
      human.statusLabel = 'Rondando a Garagem 💦';
      human.speech = 'Ah lembrei! Lavar a garagem!';
      human.speechTimer = 2.0;
    }
    return;
  }

  human.distractionCooldown -= dt;
  if (human.distractionCooldown <= 0) {
    triggerStefannyDistraction(state, 'Espera... o que eu vim fazer aqui mesmo? 🤔');
    return;
  }

  human.waterActive = true;
  human.puddleSpawnTimer -= dt;
  if (human.puddleSpawnTimer <= 0) {
    human.puddleSpawnTimer = 1.6;
    const rawPuddleX = human.x + Math.cos(human.angle) * 48;
    const rawPuddleY = human.y + Math.sin(human.angle) * 48;
    const safePuddlePos = resolveWallCollisions(rawPuddleX, rawPuddleY, 20, walls);
    if (state.puddles.length < 6) {
      state.puddles.push({ x: safePuddlePos.x, y: safePuddlePos.y, radius: 22, ttl: 5.5 });
    }
  }

  if (
    isPointInCone(
      pacoca.x,
      pacoca.y,
      human.x,
      human.y,
      human.angle,
      0.45,
      human.waterRange,
      walls
    )
  ) {
    applyWaterDamage(state);
    if (state.status !== EstadoDaPartida.EM_ANDAMENTO) return;
  }

  if (
    handleHumanReactionPhase(human, canSeePacoca, dt, (remainingDt) => {
      human.mode = ModoDoHumano.PERSEGUICAO;
      human.lostSightTimer = 0;
      human.statusLabel = 'Boss: Pegando Paçoca! ⚡';
      human.speech = 'PAÇOCA NÃO! Acabei de lavar a garagem!';
      human.speechTimer = 2.0;
      if (remainingDt > 0) {
        moveEntityToward(
          human,
          pacoca.x,
          pacoca.y,
          BASE_SPEED * human.chaseMultiplier,
          remainingDt,
          state
        );
      }
    })
  ) {
    return;
  }

  if (human.mode === ModoDoHumano.PERSEGUICAO) {
    moveEntityToward(human, pacoca.x, pacoca.y, BASE_SPEED * human.chaseMultiplier, dt, state);
    if (!directLineOfSight || !isInGarage(pacoca.x, pacoca.y)) {
      human.lostSightTimer += dt;
      if (human.lostSightTimer >= 2.0) {
        human.mode = ModoDoHumano.PATRULHA;
        human.statusLabel = 'Rondando a Garagem 💦';
      }
    } else {
      human.lostSightTimer = 0;
    }
  } else if (human.mode === ModoDoHumano.INVESTIGACAO && human.investigateTarget) {
    human.statusLabel = 'Indo olhar 👀';
    const reached = moveEntityToward(
      human,
      human.investigateTarget.x,
      human.investigateTarget.y,
      BASE_SPEED * 0.9,
      dt,
      state
    );
    human.investigateTarget.timer -= dt;
    if (reached || human.investigateTarget.timer <= 0) {
      human.mode = ModoDoHumano.PATRULHA;
      human.statusLabel = 'Rondando a Garagem 💦';
    }
  } else {
    human.statusLabel = 'Rondando a Garagem 💦';
    advanceHumanPatrolWaypoint(human, state, dt);
  }
}

function updateBryanBehavior(human, state, dt, canSeePacoca, directLineOfSight) {
  const pacoca = state.pacoca;
  human.notePhase += dt * 4;
  human.callMomCooldown -= dt;
  if (human.callMomCooldown <= 0 && human.mode === ModoDoHumano.PATRULHA) {
    human.callMomCooldown = 14.0;
    human.speech = 'MÃEEE! Onde tá meu brinquedo?!';
    human.speechTimer = 2.2;
    triggerStefannyDistraction(state, 'Já vou, Bryan! Onde eu deixei aquilo? 💭');
  }

  if (
    handleHumanReactionPhase(human, canSeePacoca, dt, (remainingDt) => {
      human.mode = ModoDoHumano.PERSEGUICAO;
      human.isHumming = false;
      human.lostSightTimer = 0;
      human.statusLabel = 'Correndo atrás! 🏃';
      human.speech = 'Peguei você, Paçoca!';
      human.speechTimer = 1.8;
      if (remainingDt > 0) {
        moveEntityToward(
          human,
          pacoca.x,
          pacoca.y,
          BASE_SPEED * human.chaseMultiplier,
          remainingDt,
          state
        );
      }
    })
  ) {
    human.isHumming = false;
    return;
  }

  if (human.mode === ModoDoHumano.PERSEGUICAO) {
    human.isHumming = false;
    moveEntityToward(human, pacoca.x, pacoca.y, BASE_SPEED * human.chaseMultiplier, dt, state);
    if (!directLineOfSight) {
      human.lostSightTimer += dt;
      if (human.lostSightTimer >= 2.4) {
        human.mode = ModoDoHumano.PATRULHA;
        human.isHumming = true;
        human.statusLabel = 'Cantarolando 🎵';
        human.speech = '♪ ♫ ♪';
      }
    } else {
      human.lostSightTimer = 0;
    }
  } else if (human.mode === ModoDoHumano.INVESTIGACAO && human.investigateTarget) {
    human.isHumming = false;
    human.statusLabel = 'Procurando Paçoca 👀';
    const reached = moveEntityToward(
      human,
      human.investigateTarget.x,
      human.investigateTarget.y,
      BASE_SPEED * 0.85,
      dt,
      state
    );
    human.investigateTarget.timer -= dt;
    if (reached || human.investigateTarget.timer <= 0) {
      human.mode = ModoDoHumano.PATRULHA;
      human.isHumming = true;
      human.statusLabel = 'Cantarolando 🎵';
      human.speech = '♪ ♫ ♪';
    }
  } else {
    human.isHumming = true;
    human.statusLabel = 'Cantarolando 🎵';
    if (!human.speech) human.speech = '♪ ♫ ♪';
    advanceHumanPatrolWaypoint(human, state, dt);
  }
}

function updateArthurBehavior(human, state, dt, canSeePacoca, directLineOfSight) {
  const pacoca = state.pacoca;
  if (human.mode === ModoDoHumano.MANOBRA_DE_SKATE) {
    human.trickTimer -= dt;
    human.angle += dt * Math.PI * 4;
    human.statusLabel = 'Manobra de Skate! 🛹';
    if (human.trickTimer <= 0) {
      human.mode = ModoDoHumano.PATRULHA;
      human.trickCooldown = 7.0;
      human.statusLabel = 'Skate no Quintal 🛹';
    }
    return;
  }

  human.trickCooldown -= dt;
  if (human.trickCooldown <= 0) {
    human.mode = ModoDoHumano.MANOBRA_DE_SKATE;
    human.trickTimer = 1.6;
    human.speech = 'Olha esse flip no skate! 🛹✨';
    human.speechTimer = 1.6;
    return;
  }

  if (
    handleHumanReactionPhase(human, canSeePacoca, dt, (remainingDt) => {
      human.mode = ModoDoHumano.PERSEGUICAO;
      human.lostSightTimer = 0;
      human.statusLabel = 'No Skate atrás! 🛹💨';
      human.speech = 'Bora pegar o Paçoca de skate!';
      human.speechTimer = 1.5;
      if (remainingDt > 0) {
        moveEntityToward(human, pacoca.x, pacoca.y, BASE_SPEED * human.chaseMultiplier, remainingDt);
      }
    })
  ) {
    return;
  }

  if (human.mode === ModoDoHumano.PERSEGUICAO) {
    moveEntityToward(human, pacoca.x, pacoca.y, BASE_SPEED * human.chaseMultiplier, dt);
    if (!directLineOfSight || !isInYard(pacoca.x, pacoca.y)) {
      human.lostSightTimer += dt;
      if (human.lostSightTimer >= 1.2) {
        human.mode = ModoDoHumano.PATRULHA;
        human.statusLabel = 'Distraído no Skate 🛹';
        human.speech = 'Ué, cadê ele? Vou andar de skate!';
        human.speechTimer = 1.8;
      }
    } else {
      human.lostSightTimer = 0;
    }
  } else if (human.mode === ModoDoHumano.INVESTIGACAO && human.investigateTarget) {
    human.statusLabel = 'Indo de Skate 🛹';
    const reached = moveEntityToward(
      human,
      human.investigateTarget.x,
      human.investigateTarget.y,
      BASE_SPEED * human.patrolMultiplier,
      dt
    );
    human.investigateTarget.timer -= dt;
    if (reached || human.investigateTarget.timer <= 0) {
      human.mode = ModoDoHumano.PATRULHA;
      human.statusLabel = 'Skate no Quintal 🛹';
    }
  } else {
    human.statusLabel = 'Skate no Quintal 🛹';
    const targetWaypoint = human.waypoints[human.waypointIndex];
    if (
      moveEntityToward(
        human,
        targetWaypoint.x,
        targetWaypoint.y,
        BASE_SPEED * human.patrolMultiplier,
        dt
      )
    ) {
      human.waypointIndex = (human.waypointIndex + 1) % human.waypoints.length;
    }
  }
}

const HUMAN_BEHAVIOR_STRATEGIES = Object.freeze({
  emily: updateEmilyBehavior,
  diego: updateDiegoBehavior,
  stefanny: updateStefannyBehavior,
  bryan: updateBryanBehavior,
  arthur: updateArthurBehavior,
});

export function updateHumanEntity(human, state, dt, isPacocaInSafeBlindSpot) {
  if (human.speechTimer > 0) {
    human.speechTimer = Math.max(0, human.speechTimer - dt);
    if (human.speechTimer === 0 && human.id !== 'bryan') {
      human.speech = '';
    }
  }

  if (updateHumanPeeCleaning(human, state, dt)) {
    return;
  }

  const pacoca = state.pacoca;
  const walls = (state.map || MAP_CONFIG).walls;
  const canSeePacoca =
    !isPacocaInSafeBlindSpot &&
    isPointInCone(
      pacoca.x,
      pacoca.y,
      human.x,
      human.y,
      human.angle,
      human.fov,
      human.visionRange,
      walls
    );
  const directLineOfSight = hasLineOfSight(human.x, human.y, pacoca.x, pacoca.y, walls);

  const strategy = HUMAN_BEHAVIOR_STRATEGIES[human.id];
  if (strategy) {
    const canCaptureAfterStep = strategy(human, state, dt, canSeePacoca, directLineOfSight);
    if (canCaptureAfterStep === false || state.status !== EstadoDaPartida.EM_ANDAMENTO) {
      return;
    }
  }

  const distanceToPacoca = Math.hypot(human.x - pacoca.x, human.y - pacoca.y);
  if (distanceToPacoca < human.radius + pacoca.radius - 2) {
    state.status = EstadoDaPartida.CAPTURADO_NO_COLO;
    state.capturedBy = human;
    state.soundEvents.push(EventoSonoro.CAPTURADO);
  }
}
