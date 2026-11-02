/**
 * Fachada Pública de Mapa e Visão Espacial (Compatibilidade com Consumidores e Testes).
 * Reexporta os serviços puros da camada `src/domain/`.
 */
export {
  MAP_CONFIG,
  generateHouseLayout,
} from './domain/house/house-layout-generator.js';

export {
  circleIntersectsRect,
  resolveWallCollisions,
  hasLineOfSight,
  normalizeAngle,
  isPointInCone,
  computeVisibilityPolygon,
  isPointVisibleToPacoca,
} from './domain/geometry/spatial-vision.js';
