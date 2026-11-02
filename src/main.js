/**
 * Ponto de Entrada da Aplicação Web (Composition Root).
 * Inicializa o controlador de apresentação (`bootstrapGamePresentation`) para os elementos da página:
 * `#game-canvas`, `#hud-hearts`, `#hud-pee`, `#hud-pee-bar`, `#hud-timer`, `#hud-alert`,
 * `#humans-list`, `#records-list`, `#intro-modal`, `#end-modal`, `#fullscreen-btn`.
 */
import { bootstrapGamePresentation } from './presentation/ui/game-controller.js';

bootstrapGamePresentation();
