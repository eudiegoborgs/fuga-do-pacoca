/**
 * Regras Espaciais de Zonas da Casa e Navegação de Entidades.
 * Garante a invariante de domínio: sempre deve permanecer ao menos 1 humano ativo dentro da casa.
 */
import { BASE_SPEED } from '../ubiquitous-language.js';
import { resolveWallCollisions } from '../geometry/spatial-vision.js';
import { MAP_CONFIG } from '../house/house-layout-generator.js';

export function isInYard(x, y) {
  return x < 160 || y < 160;
}

export function isInGarage(x, y) {
  return y >= 736 && x < 470;
}

export function isInsideHouse(x, y) {
  return x >= 175 && x <= 645 && y >= 175 && y <= 712;
}

export function isPacocaInStartSafeBlindSpot(state) {
  const pacoca = state.pacoca;
  const startBedroom = (state.map || MAP_CONFIG).rooms.find((room) => room.id === 'quarto_1');
  return Boolean(
    startBedroom &&
      pacoca.x > startBedroom.x + 12 &&
      pacoca.y >= startBedroom.y &&
      pacoca.y <= startBedroom.y + startBedroom.h
  );
}

export function countOtherActiveIndoorHumans(state, excludeHumanId) {
  let activeIndoorCount = 0;
  for (const otherHuman of state.humans) {
    if (otherHuman.id === excludeHumanId || otherHuman.inCall) continue;
    if (isInsideHouse(otherHuman.x, otherHuman.y)) activeIndoorCount++;
  }
  return activeIndoorCount;
}

export function selectNextIndoorWaypointIndex(waypoints) {
  for (let index = 0; index < waypoints.length; index++) {
    if (isInsideHouse(waypoints[index].x, waypoints[index].y) && waypoints[index].y < 500) {
      return index;
    }
  }
  return 0;
}

export function moveEntityToward(entity, targetX, targetY, speed, dt, state = null) {
  let clampedTargetX = targetX;
  let clampedTargetY = targetY;

  if (entity.stayInYard && !isInYard(clampedTargetX, clampedTargetY)) {
    if (entity.x < 160) {
      clampedTargetX = Math.min(142, clampedTargetX);
      clampedTargetY = Math.min(704, clampedTargetY);
    } else {
      clampedTargetY = Math.min(142, clampedTargetY);
    }
  }

  if (entity.stayInGarage) {
    clampedTargetX = Math.max(36, Math.min(448, clampedTargetX));
    clampedTargetY = Math.max(752, Math.min(985, clampedTargetY));
  }

  // Invariante de negócio: o último humano ativo dentro de casa não pode sair para o quintal/garagem
  if (
    state &&
    !entity.stayInYard &&
    !entity.stayInGarage &&
    isInsideHouse(entity.x, entity.y) &&
    !isInsideHouse(clampedTargetX, clampedTargetY) &&
    countOtherActiveIndoorHumans(state, entity.id) === 0
  ) {
    clampedTargetX = Math.max(205, Math.min(620, clampedTargetX));
    clampedTargetY = Math.max(205, Math.min(685, clampedTargetY));
  }

  const deltaX = clampedTargetX - entity.x;
  const deltaY = clampedTargetY - entity.y;
  const distance = Math.hypot(deltaX, deltaY);
  if (distance < 1e-3) return true;

  entity.angle = Math.atan2(deltaY, deltaX);
  const stepDistance = Math.min(distance, speed * dt);
  const nextX = entity.x + (deltaX / distance) * stepDistance;
  const nextY = entity.y + (deltaY / distance) * stepDistance;
  const walls = (state?.map || MAP_CONFIG).walls;
  const resolvedPosition = resolveWallCollisions(nextX, nextY, entity.radius, walls);
  entity.x = resolvedPosition.x;
  entity.y = resolvedPosition.y;
  return distance <= stepDistance + 5;
}

export function advanceHumanPatrolWaypoint(human, state, dt) {
  let targetWaypoint = human.waypoints[human.waypointIndex];
  if (
    !human.stayInYard &&
    !human.stayInGarage &&
    isInsideHouse(human.x, human.y) &&
    !isInsideHouse(targetWaypoint.x, targetWaypoint.y) &&
    countOtherActiveIndoorHumans(state, human.id) === 0
  ) {
    human.waypointIndex = selectNextIndoorWaypointIndex(human.waypoints);
    targetWaypoint = human.waypoints[human.waypointIndex];
  }
  if (
    moveEntityToward(
      human,
      targetWaypoint.x,
      targetWaypoint.y,
      BASE_SPEED * human.patrolMultiplier,
      dt,
      state
    )
  ) {
    human.waypointIndex = (human.waypointIndex + 1) % human.waypoints.length;
  }
}
