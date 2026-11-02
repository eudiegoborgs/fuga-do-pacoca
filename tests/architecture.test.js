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
    'src/domain/ubiquitous-language.js',
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
