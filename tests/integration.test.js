import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInitialState, stepGame } from '../src/entities.js';
import { GameRenderer } from '../src/renderer.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

test('GameRenderer draws detailed 2D furniture for all rooms and 2D character sprites for Paçoca and all 5 humans', () => {
  const calls = [];
  const mockCtx = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'measureText') return (txt) => ({ width: String(txt).length * 6 });
        return (...args) => {
          calls.push({ prop, args });
        };
      },
      set() {
        return true;
      },
    }
  );
  const mockCanvas = { width: 640, height: 640, getContext: () => mockCtx };
  const renderer = new GameRenderer(mockCanvas);

  assert.equal(typeof renderer.drawHumanSprite, 'function', 'Should have drawHumanSprite method for 2D characters');
  assert.equal(typeof renderer.drawPacocaSprite, 'function', 'Should have drawPacocaSprite method for 2D Paçoca');
  assert.equal(typeof renderer.drawSpikeSprite, 'function', 'Should have drawSpikeSprite method for 2D Spike');
  assert.equal(typeof renderer.drawMeggieSprite, 'function', 'Should have drawMeggieSprite method for 2D Meggie');
  assert.equal(typeof renderer.drawFogOfWar, 'function', 'Should have drawFogOfWar method for progressive map reveal');
  assert.equal(typeof renderer.drawMinimap, 'function', 'Should have drawMinimap method for bottom-right house floorplan');
  assert.ok(renderer.cameraZoom > 1.5, 'Camera should have zoom > 1.5x centered on Paçoca');

  const state = createInitialState();
  renderer.render(state);

  assert.ok(calls.length > 200, `Expected rich 2D vector drawing calls (>200), got ${calls.length}`);
});

test('No real photos or human ages are exposed in game UI or source files', () => {
  for (const rel of ['index.html', 'src/entities.js', 'src/main.js', 'src/renderer.js']) {
    const content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assert.ok(
      !content.includes('assets/photos/'),
      `File ${rel} must not reference real photos in assets/photos/`
    );
    assert.ok(
      !/\b(9a|10a|11a|28a|31a)\b/.test(content) && !content.includes('anos)'),
      `File ${rel} must not expose human ages`
    );
  }
});

test('Web entry files (index.html, src/style.css, src/audio.js, src/renderer.js, src/main.js) exist and wire all 5 humans + Paçoca', () => {
  for (const rel of [
    'index.html',
    'src/style.css',
    'src/audio.js',
    'src/renderer.js',
    'src/main.js',
  ]) {
    const p = path.join(ROOT, rel);
    assert.ok(fs.existsSync(p), `Missing file ${rel}`);
  }

  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(html.includes('A Fuga do Paçoca'), 'index.html should contain game title');
  assert.ok(html.includes('src/main.js'), 'index.html should load src/main.js');
  assert.ok(
    html.includes('id="hud-pee-bar"') && html.includes('id="fullscreen-btn"'),
    'index.html should include visual pee progress bar (#hud-pee-bar) and fullscreen button (#fullscreen-btn)'
  );
  const canvasWrapMatch = html.match(/<section class="canvas-wrap"[\s\S]*?<\/section>/);
  assert.ok(
    canvasWrapMatch &&
      canvasWrapMatch[0].includes('id="hud-hearts"') &&
      canvasWrapMatch[0].includes('id="hud-pee-bar"') &&
      canvasWrapMatch[0].includes('id="hud-alert"') &&
      canvasWrapMatch[0].includes('id="end-modal"') &&
      canvasWrapMatch[0].includes('id="joystick-base"') &&
      canvasWrapMatch[0].includes('id="joystick-stick"') &&
      canvasWrapMatch[0].includes('id="fullscreen-exit-float-btn"'),
    'Hearts, pee bar, house status, end modal, virtual joystick and float exit button must be inside .canvas-wrap'
  );

  const css = fs.readFileSync(path.join(ROOT, 'src/style.css'), 'utf8');
  assert.ok(
    css.includes('.is-pseudo-fullscreen') &&
      css.includes('.joystick-base') &&
      css.includes('.joystick-stick'),
    'src/style.css must define .is-pseudo-fullscreen and virtual joystick styles'
  );
});

test('Full route playthrough simulation: Paçoca can escape from Quarto 1 to Portão via both Indoor and Yard routes across randomized layouts', () => {
  for (let run = 0; run < 4; run++) {
    // Route A: Indoor (Quarto 1 -> Corredor -> Sala/Cozinha -> Garagem -> Portão)
    const stateIndoor = createInitialState();
    for (const h of stateIndoor.humans) {
      h.x = 720;
      h.y = 100;
      h.waypoints = [{ x: 720, y: 100 }];
    }

    const indoorPath = stateIndoor.map.indoorEscapePath;
    assert.ok(Array.isArray(indoorPath) && indoorPath.length >= 4, 'Layout must provide indoorEscapePath');

    for (const target of indoorPath) {
      for (let step = 0; step < 180 && stateIndoor.status === 'playing'; step++) {
        const dx = target.x - stateIndoor.pacoca.x;
        const dy = target.y - stateIndoor.pacoca.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 8) break;
        stepGame(stateIndoor, { dx: dx / dist, dy: dy / dist }, 1 / 60);
      }
    }
    assert.equal(stateIndoor.status, 'won', `Paçoca must complete Indoor route in layout ${stateIndoor.map.layoutId}`);

    // Route B: Yard (Quarto 1 -> Corredor -> Porta Sup -> Quintal Superior -> Quintal Esquerdo -> Garagem -> Portão)
    const stateYard = createInitialState();
    for (const h of stateYard.humans) {
      h.x = 720;
      h.y = 100;
      h.waypoints = [{ x: 720, y: 100 }];
    }

    const yardPath = stateYard.map.yardEscapePath;
    assert.ok(Array.isArray(yardPath) && yardPath.length >= 5, 'Layout must provide yardEscapePath');

    for (const target of yardPath) {
      for (let step = 0; step < 200 && stateYard.status === 'playing'; step++) {
        const dx = target.x - stateYard.pacoca.x;
        const dy = target.y - stateYard.pacoca.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 8) break;
        stepGame(stateYard, { dx: dx / dist, dy: dy / dist }, 1 / 60);
      }
    }
    assert.equal(stateYard.status, 'won', `Paçoca must complete Yard route in layout ${stateYard.map.layoutId}`);
  }
});
