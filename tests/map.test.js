import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAP_CONFIG,
  circleIntersectsRect,
  resolveWallCollisions,
  hasLineOfSight,
  isPointInCone,
  computeVisibilityPolygon,
  isPointVisibleToPacoca,
} from '../src/map.js';

test('MAP_CONFIG defines all house areas, doors, spawn, exit gate, and 4 cameras', () => {
  assert.equal(MAP_CONFIG.width, 800);
  assert.equal(MAP_CONFIG.height, 1050);

  const roomIds = MAP_CONFIG.rooms.map((r) => r.id);
  for (const expected of [
    'quintal_topo',
    'quintal_esq',
    'quintal_dir',
    'cozinha',
    'sala',
    'ambiente_conectado',
    'quarto_1',
    'banheiro',
    'quarto_2',
    'quarto_3',
    'garagem',
    'area_nao_acessivel',
  ]) {
    assert.ok(roomIds.includes(expected), `Missing room ${expected}`);
  }

  // Spawn is inside Quarto 1 (top-right bedroom)
  const q1 = MAP_CONFIG.rooms.find((r) => r.id === 'quarto_1');
  assert.ok(
    MAP_CONFIG.spawn.x > q1.x &&
      MAP_CONFIG.spawn.x < q1.x + q1.w &&
      MAP_CONFIG.spawn.y > q1.y &&
      MAP_CONFIG.spawn.y < q1.y + q1.h,
    'Spawn should be inside Quarto 1'
  );

  // Exit gate is at bottom of accessible Garagem
  assert.ok(MAP_CONFIG.exitGate.y > 950, 'Exit gate should be at bottom of Garagem');
  assert.equal(MAP_CONFIG.cameras.length, 4, 'Should have 4 corner security cameras (top-left, top-right, bottom-left, bottom-right)');
  const camIds = MAP_CONFIG.cameras.map((c) => c.id);
  for (const id of [
    'cam_quintal_sup_esq',
    'cam_quintal_sup_dir',
    'cam_quintal_inf_esq',
    'cam_quintal_inf_dir',
  ]) {
    assert.ok(camIds.includes(id), `Missing corner camera ${id}`);
  }
});

test('resolveWallCollisions prevents clipping into walls and Area Nao Acessivel', () => {
  const blocked = MAP_CONFIG.rooms.find((r) => r.id === 'area_nao_acessivel');
  // Try pushing a circle right into the left edge of Area Nao Acessivel
  const pos = resolveWallCollisions(blocked.x + 2, blocked.y + 80, 14, MAP_CONFIG.walls);
  assert.ok(pos.x + 14 <= blocked.x + 0.01, `Expected pushed out of blocked area, got x=${pos.x}`);

  // Corner collision check: pushing into top-left outer wall corner stays inside bounds
  const corner = resolveWallCollisions(5, 5, 14, MAP_CONFIG.walls);
  assert.ok(corner.x >= 14 && corner.y >= 14);
});

test('hasLineOfSight is blocked by solid walls and open through doorways', () => {
  // Inside Quarto 1 looking straight through the solid top wall into Quintal Topo -> blocked
  const q1 = MAP_CONFIG.rooms.find((r) => r.id === 'quarto_1');
  const qt = MAP_CONFIG.rooms.find((r) => r.id === 'quintal_topo');
  assert.equal(
    hasLineOfSight(q1.x + q1.w / 2, q1.y + 40, q1.x + q1.w / 2, qt.y + 40, MAP_CONFIG.walls),
    false,
    'Solid wall between Quarto 1 and Quintal Topo should block line of sight'
  );

  // Inside Cozinha to Sala across Ambiente Conectado -> open
  assert.equal(
    hasLineOfSight(380, 320, 380, 560, MAP_CONFIG.walls),
    true,
    'Ambiente conectado between Cozinha and Sala should have clear line of sight'
  );
});

test('isPointInCone respects range, FOV angle, and wall occlusion', () => {
  const walls = [{ x: 200, y: 0, w: 20, h: 200 }];
  // Point directly ahead (angle 0), within range, no wall between (50,50) and (120,50)
  assert.equal(isPointInCone(120, 50, 50, 50, 0, Math.PI / 3, 150, walls), true);
  // Point behind cone angle
  assert.equal(isPointInCone(10, 50, 50, 50, 0, Math.PI / 3, 150, walls), false);
  // Point beyond range
  assert.equal(isPointInCone(180, 50, 50, 50, 0, Math.PI / 3, 100, walls), false);
  // Point inside angle and range, but occluded by wall at x=200
  assert.equal(isPointInCone(260, 50, 150, 50, 0, Math.PI / 3, 200, walls), false);
});

test('computeVisibilityPolygon clips rays against walls and isPointVisibleToPacoca respects visible space', () => {
  const walls = [{ x: 150, y: 0, w: 20, h: 200 }];
  const poly = computeVisibilityPolygon(100, 100, 200, walls, 36);
  assert.equal(poly.length, 36);

  // Ray pointing right (+x, index 0 where angle=0) must be stopped at x=150 by the wall
  assert.ok(poly[0].x <= 150.5, `Expected ray at angle 0 stopped at wall x=150, got ${poly[0].x}`);
  // Ray pointing left (-x, index 18 where angle=PI) has no wall and reaches full radius (100 - 200 = -100)
  assert.ok(poly[18].x <= -99, `Expected ray at angle PI to reach full radius, got ${poly[18].x}`);

  assert.equal(isPointVisibleToPacoca(130, 100, 100, 100, 200, walls), true);
  assert.equal(isPointVisibleToPacoca(200, 100, 100, 100, 200, walls), false);
});

test('generateHouseLayout produces 30 distinct floorplans with different rooms, structures, yard layouts, and exitGate positions', async () => {
  const mapMod = await import('../src/map.js');
  assert.equal(typeof mapMod.generateHouseLayout, 'function', 'Should export generateHouseLayout');

  const layouts = [];
  const extraRoomIds = new Set();
  for (let i = 0; i < 30; i++) {
    const layout = mapMod.generateHouseLayout(i);
    layouts.push(layout);

    const q1 = layout.rooms.find((r) => r.id === 'quarto_1');
    assert.ok(q1, `Layout ${i} must include quarto_1`);
    assert.ok(
      layout.spawn.x > q1.x &&
        layout.spawn.x < q1.x + q1.w &&
        layout.spawn.y > q1.y &&
        layout.spawn.y < q1.y + q1.h,
      `Spawn must be inside quarto_1 in layout ${i}`
    );

    for (const r of layout.rooms) {
      if (
        ![
          'quintal_esq',
          'quintal_topo',
          'quintal_dir',
          'cozinha',
          'sala',
          'ambiente_conectado',
          'corredor',
          'quarto_1',
          'quarto_2',
          'quarto_3',
          'banheiro',
          'garagem',
          'area_nao_acessivel',
        ].includes(r.id)
      ) {
        extraRoomIds.add(r.id);
      }
    }
  }

  const uniqueSignatures = new Set(
    layouts.map((l) =>
      JSON.stringify({
        spawn: l.spawn,
        rooms: l.rooms.map((r) => ({ id: r.id, x: r.x, y: r.y, w: r.w, h: r.h })),
        doors: l.doors.map((d) => ({ id: d.id, x: d.x, y: d.y })),
        gate: l.exitGate,
      })
    )
  );
  assert.equal(
    uniqueSignatures.size,
    30,
    `Expected 30 completely distinct house floorplans, got ${uniqueSignatures.size}`
  );
  assert.ok(
    extraRoomIds.size >= 8,
    `Expected at least 8 different extra room types across the 30 floorplans, got ${[...extraRoomIds]}`
  );

  const uniqueYardSignatures = new Set(
    layouts.map((l) =>
      JSON.stringify({
        yardPassage: l.doors.find((d) => d.id === 'passagem_quintal_garagem'),
        yardFeatures: l.yardFeatures,
        yardWaypoints: l.yardWaypoints,
      })
    )
  );
  assert.ok(
    uniqueYardSignatures.size >= 15,
    `Expected at least 15 distinct yard layouts across the 30 variants, got ${uniqueYardSignatures.size}`
  );

  const uniqueGateY = new Set(layouts.map((l) => l.exitGate.y));
  assert.ok(
    uniqueGateY.size >= 3,
    `Expected exitGate to change wall/vertical position across layouts, got ${[...uniqueGateY]}`
  );
});
