/**
 * Ponto de Entrada da Aplicação Web (Composition Root com Inversão de Controle - IoC).
 * Monta o container de dependências (`createGameContainer`) e inicializa o controlador de apresentação.
 */
import { createGameContainer } from './container/ioc-container.js';
import { bootstrapGamePresentation } from './presentation/ui/game-controller.js';

const container = createGameContainer();
bootstrapGamePresentation(container);
