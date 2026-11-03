/**
 * Regras de Domínio para o comportamento dos cães da casa (Spike e Meggie).
 * - Spike: permanece parado em seu território; briga se o Paçoca entrar em seu raio circular de domínio.
 * - Meggie: patrulha os cômodos da casa com metade da visão humana e late para alertar a família.
 */
import {
  BASE_SPEED,
  SPIKE_DOMAIN_RADIUS,
} from '../../config/game-config.js';
import {
  ModoDoCao,
  EventoSonoro,
} from '../partida-states.js';
import { hasLineOfSight, isPointInCone } from '../geometry/spatial-vision.js';
import { MAP_CONFIG } from '../house/house-layout-generator.js';
import { moveEntityToward } from './house-zones.js';
import {
  applyWaterDamage,
  alertHumans,
  alertHumansInSameRoom,
} from './stealth-and-pee-rules.js';

export function updateSpikeTerritoryDomain(state, dt, isPacocaInSafeBlindSpot) {
  const spike = state.spike;
  if (!spike) return;

  if (spike.speechTimer > 0) {
    spike.speechTimer = Math.max(0, spike.speechTimer - dt);
    if (spike.speechTimer === 0) spike.speech = '';
  }
  if (spike.fightCooldown > 0) {
    spike.fightCooldown = Math.max(0, spike.fightCooldown - dt);
  }

  const pacoca = state.pacoca;
  const walls = (state.map || MAP_CONFIG).walls;
  const domainRadius = spike.domainRadius || SPIKE_DOMAIN_RADIUS;
  const distanceToSpike = Math.hypot(pacoca.x - spike.x, pacoca.y - spike.y);
  const isInsideSpikeDomain =
    distanceToSpike <= domainRadius &&
    hasLineOfSight(spike.x, spike.y, pacoca.x, pacoca.y, walls);

  if (!isPacocaInSafeBlindSpot && spike.fightCooldown <= 0 && isInsideSpikeDomain) {
    spike.mode = ModoDoCao.BRIGANDO_POR_TERRITORIO;
    spike.isLyingDown = false;
    spike.fightTimer = 0.5;
    spike.fightCooldown = 3.0;
    spike.statusLabel = 'Brigando na Área de Domínio! 💢';
    spike.speech = 'GRRR! AU! 💢';
    spike.speechTimer = 1.4;
    pacoca.fightTimer = 0.5;
    pacoca.isMoving = false;
    applyWaterDamage(state);
    state.soundEvents.push(EventoSonoro.BRIGA_SPIKE);
    alertHumansInSameRoom(state, spike.x, spike.y, 'Briga com o Spike');
  } else if (spike.mode === ModoDoCao.BRIGANDO_POR_TERRITORIO) {
    spike.fightTimer -= dt;
    if (spike.fightTimer <= 0) {
      spike.mode = ModoDoCao.DEITADO_EM_DOMINIO;
      spike.isLyingDown = true;
      spike.statusLabel = 'Parado (Área de Domínio) 💤';
    }
  } else {
    spike.mode = ModoDoCao.DEITADO_EM_DOMINIO;
    spike.isLyingDown = true;
    spike.statusLabel = 'Parado (Área de Domínio) 💤';
  }
}

export function updateMeggieHousePatrol(state, dt, isPacocaInSafeBlindSpot) {
  const meggie = state.meggie;
  if (!meggie) return;

  if (meggie.speechTimer > 0) {
    meggie.speechTimer = Math.max(0, meggie.speechTimer - dt);
    if (meggie.speechTimer === 0) meggie.speech = '';
  }
  if (meggie.barkCooldown > 0) {
    meggie.barkCooldown = Math.max(0, meggie.barkCooldown - dt);
  }

  const pacoca = state.pacoca;
  const walls = (state.map || MAP_CONFIG).walls;
  const meggieSpotsPacoca =
    !isPacocaInSafeBlindSpot &&
    (isPointInCone(
      pacoca.x,
      pacoca.y,
      meggie.x,
      meggie.y,
      meggie.angle,
      meggie.fov,
      meggie.visionRange,
      walls
    ) ||
      Math.hypot(pacoca.x - meggie.x, pacoca.y - meggie.y) <= meggie.radius + pacoca.radius + 6);

  if (meggieSpotsPacoca && meggie.barkCooldown <= 0) {
    meggie.mode = ModoDoCao.LATINDO_ALERTA;
    meggie.barkTimer = 1.0;
    meggie.barkCooldown = 3.5;
    meggie.statusLabel = 'Latindo! (Au au!) 📢';
    meggie.speech = 'AU AU AU! 🐾📢';
    meggie.speechTimer = 1.8;
    state.soundEvents.push(EventoSonoro.LATIDO_MEGGIE);
    alertHumans(state, pacoca.x, pacoca.y, 'Latido da Meggie');
  } else if (meggie.mode === ModoDoCao.LATINDO_ALERTA) {
    meggie.barkTimer -= dt;
    if (meggie.barkTimer <= 0) {
      meggie.mode = ModoDoCao.RONDA_PELA_CASA;
      meggie.statusLabel = 'Andando pela casa 🐾';
    }
  } else {
    meggie.statusLabel = 'Andando pela casa 🐾';
    const targetWaypoint = meggie.waypoints[meggie.waypointIndex];
    if (
      moveEntityToward(
        meggie,
        targetWaypoint.x,
        targetWaypoint.y,
        BASE_SPEED * meggie.patrolMultiplier,
        dt
      )
    ) {
      meggie.waypointIndex = (meggie.waypointIndex + 1) % meggie.waypoints.length;
    }
  }
}
