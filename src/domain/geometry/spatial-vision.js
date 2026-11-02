/**
 * Serviço de Domínio Geométrico e Óptico (Colisões, Linha de Visão, Cones e Polígono de Visibilidade).
 */

export const MAP_DIMENSIONS = Object.freeze({
  width: 800,
  height: 1050,
});

export function circleIntersectsRect(cx, cy, radius, rect) {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < radius * radius;
}

export function resolveWallCollisions(
  x,
  y,
  radius,
  walls,
  boundsWidth = MAP_DIMENSIONS.width,
  boundsHeight = MAP_DIMENSIONS.height
) {
  let cx = Math.max(16 + radius, Math.min(boundsWidth - 16 - radius, x));
  let cy = Math.max(16 + radius, Math.min(boundsHeight - 16 - radius, y));

  for (let pass = 0; pass < 3; pass++) {
    for (const wall of walls) {
      const closestX = Math.max(wall.x, Math.min(cx, wall.x + wall.w));
      const closestY = Math.max(wall.y, Math.min(cy, wall.y + wall.h));
      const dx = cx - closestX;
      const dy = cy - closestY;
      const distSq = dx * dx + dy * dy;

      if (distSq < radius * radius) {
        if (distSq > 1e-6) {
          const dist = Math.sqrt(distSq);
          const overlap = radius - dist;
          cx += (dx / dist) * overlap;
          cy += (dy / dist) * overlap;
        } else {
          const leftPen = cx - wall.x;
          const rightPen = wall.x + wall.w - cx;
          const topPen = cy - wall.y;
          const bottomPen = wall.y + wall.h - cy;
          const minPen = Math.min(leftPen, rightPen, topPen, bottomPen);
          if (minPen === leftPen) cx = wall.x - radius;
          else if (minPen === rightPen) cx = wall.x + wall.w + radius;
          else if (minPen === topPen) cy = wall.y - radius;
          else cy = wall.y + wall.h + radius;
        }
      }
    }
    cx = Math.max(16 + radius, Math.min(boundsWidth - 16 - radius, cx));
    cy = Math.max(16 + radius, Math.min(boundsHeight - 16 - radius, cy));
  }

  return { x: cx, y: cy };
}

function segmentsIntersect(p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y) {
  const s1x = p1x - p0x;
  const s1y = p1y - p0y;
  const s2x = p3x - p2x;
  const s2y = p3y - p2y;
  const denom = -s2x * s1y + s1x * s2y;
  if (Math.abs(denom) < 1e-9) return false;
  const s = (-s1y * (p0x - p2x) + s1x * (p0y - p2y)) / denom;
  const t = (s2x * (p0y - p2y) - s2y * (p0x - p2x)) / denom;
  return s >= 0 && s <= 1 && t >= 0 && t <= 1;
}

function segmentIntersectsRect(x1, y1, x2, y2, rect) {
  if (
    x1 >= rect.x &&
    x1 <= rect.x + rect.w &&
    y1 >= rect.y &&
    y1 <= rect.y + rect.h
  ) {
    return true;
  }
  if (
    x2 >= rect.x &&
    x2 <= rect.x + rect.w &&
    y2 >= rect.y &&
    y2 <= rect.y + rect.h
  ) {
    return true;
  }
  const rx = rect.x;
  const ry = rect.y;
  const rw = rect.w;
  const rh = rect.h;
  return (
    segmentsIntersect(x1, y1, x2, y2, rx, ry, rx + rw, ry) ||
    segmentsIntersect(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh) ||
    segmentsIntersect(x1, y1, x2, y2, rx + rw, ry + rh, rx, ry + rh) ||
    segmentsIntersect(x1, y1, x2, y2, rx, ry + rh, rx, ry)
  );
}

export function hasLineOfSight(x1, y1, x2, y2, walls) {
  for (const wall of walls) {
    if (segmentIntersectsRect(x1, y1, x2, y2, wall)) {
      return false;
    }
  }
  return true;
}

export function normalizeAngle(angle) {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function isPointInCone(px, py, cx, cy, angleRad, fovRad, range, walls) {
  const dx = px - cx;
  const dy = py - cy;
  const distSq = dx * dx + dy * dy;
  if (distSq > range * range) return false;
  if (distSq < 1e-4) return true;

  const targetAngle = Math.atan2(dy, dx);
  const diff = Math.abs(normalizeAngle(targetAngle - angleRad));
  if (diff > fovRad / 2) return false;

  return hasLineOfSight(cx, cy, px, py, walls);
}

function rayIntersectsRectDistance(ox, oy, dx, dy, rect, maxDist) {
  let tmin = 0;
  let tmax = maxDist;

  if (Math.abs(dx) < 1e-9) {
    if (ox < rect.x || ox > rect.x + rect.w) return null;
  } else {
    const invX = 1 / dx;
    let t1 = (rect.x - ox) * invX;
    let t2 = (rect.x + rect.w - ox) * invX;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }

  if (Math.abs(dy) < 1e-9) {
    if (oy < rect.y || oy > rect.y + rect.h) return null;
  } else {
    const invY = 1 / dy;
    let t1 = (rect.y - oy) * invY;
    let t2 = (rect.y + rect.h - oy) * invY;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }

  return tmin >= 0 && tmin <= maxDist ? tmin : null;
}

export function computeVisibilityPolygon(originX, originY, maxRadius, walls, rayCount = 96) {
  const points = [];
  for (let i = 0; i < rayCount; i++) {
    const angle = (i * Math.PI * 2) / rayCount;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let closest = maxRadius;

    for (const wall of walls) {
      const dist = rayIntersectsRectDistance(originX, originY, dx, dy, wall, closest);
      if (dist !== null && dist < closest) {
        closest = dist;
      }
    }

    points.push({
      x: originX + dx * closest,
      y: originY + dy * closest,
    });
  }
  return points;
}

export function isPointVisibleToPacoca(px, py, pacocaX, pacocaY, maxRadius, walls) {
  const dist = Math.hypot(px - pacocaX, py - pacocaY);
  if (dist > maxRadius) return false;
  return hasLineOfSight(pacocaX, pacocaY, px, py, walls);
}
