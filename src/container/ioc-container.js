/**
 * Container de Inversão de Controle (IoC) e Injeção de Dependências (DI).
 * Centraliza a resolução e o ciclo de vida (singleton / factory) de configurações,
 * repositórios de infraestrutura, motor de áudio, casos de uso e apresentação.
 */
import { GAME_CONFIG } from '../config/game-config.js';
import { formatEscapeTime } from '../application/ports/record-repository-port.js';
import {
  loadEscapeRecords,
  clearEscapeRecords,
  recordEscapeWin,
} from '../application/use-cases/escape-records-use-case.js';
import {
  createInitialState,
  stepGame,
} from '../application/use-cases/escape-simulation-use-case.js';
import { syncRecordsWithLocalhostServer } from '../infrastructure/storage/localhost-record-repository.js';
import { SoundEngine } from '../infrastructure/audio/web-audio-sound-engine.js';
import { GameRenderer } from '../presentation/canvas/game-renderer.js';

export class IoCContainer {
  constructor() {
    this.registry = new Map();
    this.singletons = new Map();
  }

  register(token, factory, { singleton = true } = {}) {
    this.registry.set(token, { factory, singleton });
    this.singletons.delete(token);
    return this;
  }

  registerValue(token, value) {
    return this.register(token, () => value, { singleton: true });
  }

  resolve(token) {
    if (this.singletons.has(token)) {
      return this.singletons.get(token);
    }
    const definition = this.registry.get(token);
    if (!definition) {
      throw new Error(`Dependência não registrada no IoCContainer: "${token}"`);
    }
    const instance = definition.factory(this);
    if (definition.singleton) {
      this.singletons.set(token, instance);
    }
    return instance;
  }
}

export function createGameContainer(overrides = {}) {
  const container = new IoCContainer();

  container.registerValue('config', overrides.config || GAME_CONFIG);

  container.register('storage', () => {
    if (overrides.storage !== undefined) {
      return overrides.storage;
    }
    return globalThis?.localStorage;
  });

  container.register('soundEngine', () => {
    if (overrides.soundEngine) {
      return overrides.soundEngine;
    }
    return new SoundEngine();
  });

  container.register('recordRepository', (ioc) => {
    if (overrides.recordRepository) {
      return overrides.recordRepository;
    }
    const storage = ioc.resolve('storage');
    return {
      formatEscapeTime,
      load: () => loadEscapeRecords(storage),
      clear: () => clearEscapeRecords(storage),
      saveWin: (timeSeconds, layoutId, status, onPersistRemote) =>
        recordEscapeWin(timeSeconds, layoutId, storage, status, onPersistRemote),
      syncWithServer: (onSyncedCallback) =>
        syncRecordsWithLocalhostServer(onSyncedCallback),
    };
  });

  container.register('simulationUseCase', () => {
    if (overrides.simulationUseCase) {
      return overrides.simulationUseCase;
    }
    return {
      createInitialState,
      stepGame,
    };
  });

  container.register(
    'rendererFactory',
    () =>
      overrides.rendererFactory ||
      ((canvasElement) => new GameRenderer(canvasElement))
  );

  return container;
}
