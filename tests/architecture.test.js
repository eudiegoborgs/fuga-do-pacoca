import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cruise } from 'dependency-cruiser';
import depCruiseConfig from '../.dependency-cruiser.cjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

test('SOLID & DDD Architecture: folder segregation, ubiquitous language, specs/ADRs, and zero dependency-cruiser violations', async () => {
  const requiredFiles = [
    'src/config/game-config.js',
    'src/domain/partida-states.js',
    'src/container/ioc-container.js',
    'src/domain/geometry/spatial-vision.js',
    'src/domain/house/floorplan-catalog.js',
    'src/domain/house/house-layout-generator.js',
    'src/domain/family/family-roster-factory.js',
    'src/domain/rules/house-zones.js',
    'src/domain/rules/stealth-and-pee-rules.js',
    'src/domain/rules/dog-behavior-rules.js',
    'src/domain/rules/human-behavior-rules.js',
    'src/application/ports/record-repository-port.js',
    'src/application/use-cases/escape-records-use-case.js',
    'src/application/use-cases/escape-simulation-use-case.js',
    'src/infrastructure/audio/web-audio-sound-engine.js',
    'src/infrastructure/storage/localhost-record-repository.js',
    'src/presentation/canvas/game-renderer.js',
    'src/presentation/ui/game-controller.js',
    'docs/specs/domain-ubiquitous-language-spec.md',
    'docs/adr/0001-layered-ddd-and-solid-architecture.md',
    'docs/adr/0002-deterministic-30-floorplan-catalog.md',
  ];

  for (const relativePath of requiredFiles) {
    assert.ok(
      fs.existsSync(path.join(ROOT, relativePath)),
      `Expected architectural file or documentation to exist: ${relativePath}`
    );
  }

  const cruiseResult = await cruise(
    [path.join(ROOT, 'src')],
    depCruiseConfig.options,
    undefined,
    {
      ...depCruiseConfig,
      ruleSet: {
        forbidden: depCruiseConfig.forbidden,
      },
    }
  );

  const violations = cruiseResult.output.summary.violations;
  assert.equal(
    violations.length,
    0,
    `Expected 0 architectural violations from dependency-cruiser, found: ${JSON.stringify(violations)}`
  );
});

test('IoC Container & Centralized Configuration: resolves contexts, handles overrides, and isolates magic numbers', async () => {
  const { GAME_CONFIG } = await import('../src/config/game-config.js');
  const { IoCContainer, createGameContainer } = await import(
    '../src/container/ioc-container.js'
  );

  assert.ok(Object.isFrozen(GAME_CONFIG), 'GAME_CONFIG must be frozen');
  assert.ok(
    Object.isFrozen(GAME_CONFIG.environment),
    'GAME_CONFIG.environment must be frozen'
  );
  assert.ok(
    Object.isFrozen(GAME_CONFIG.movement),
    'GAME_CONFIG.movement must be frozen'
  );
  assert.ok(
    Object.isFrozen(GAME_CONFIG.vision),
    'GAME_CONFIG.vision must be frozen'
  );
  assert.ok(
    Object.isFrozen(GAME_CONFIG.gameplay),
    'GAME_CONFIG.gameplay must be frozen'
  );

  assert.equal(GAME_CONFIG.vision.humanVisionRangePx, 190);
  assert.equal(GAME_CONFIG.vision.meggieVisionRangePx, 95);
  assert.equal(GAME_CONFIG.vision.spikeDomainRadiusPx, 95);

  const container = createGameContainer();
  assert.ok(container instanceof IoCContainer);
  assert.equal(container.resolve('config'), GAME_CONFIG);
  assert.ok(container.resolve('recordRepository'));
  assert.ok(container.resolve('simulationUseCase'));

  const customStorage = {
    getItem: () => '[]',
    setItem: () => {},
    removeItem: () => {},
  };
  const customContainer = createGameContainer({ storage: customStorage });
  assert.equal(customContainer.resolve('storage'), customStorage);
});
