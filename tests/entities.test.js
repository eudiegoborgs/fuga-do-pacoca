import test from 'node:test';
import assert from 'node:assert/strict';
import { MAP_CONFIG } from '../src/map.js';
import {
  BASE_SPEED,
  createInitialState,
  alertHumans,
  stepGame,
  loadEscapeRecords,
  clearEscapeRecords,
  recordEscapeWin,
} from '../src/entities.js';

test('Paçoca diagonal movement is normalized so speed never exceeds BASE_SPEED', () => {
  const state = createInitialState();
  // Place Paçoca in open Sala space where 210px diagonal does not touch bottom wall (y=706)
  state.pacoca.x = 220;
  state.pacoca.y = 480;
  // Move all humans far away so no interference
  for (const h of state.humans) {
    h.x = 720;
    h.y = 100;
  }

  stepGame(state, { dx: 1, dy: 1 }, 1.0);
  const dist = Math.hypot(state.pacoca.x - 220, state.pacoca.y - 480);
  assert.ok(
    Math.abs(dist - BASE_SPEED) < 1.0,
    `Diagonal distance in 1s should equal BASE_SPEED (${BASE_SPEED}), got ${dist}`
  );
});

test('Paçoca wins when reaching the Portão (saída) in Garagem', () => {
  const state = createInitialState();
  state.pacoca.x = MAP_CONFIG.exitGate.x + 40;
  state.pacoca.y = MAP_CONFIG.exitGate.y - 5;

  stepGame(state, { dx: 0, dy: 1 }, 0.2);
  assert.equal(state.status, 'won');
});

test('Security camera detects Paçoca after >0.35s in cone and alerts nearby humans', () => {
  const state = createInitialState();
  const cam = state.cameras[0];
  cam.sweepSpeed = 0; // freeze sweep at baseAngle for deterministic test
  state.pacoca.x = cam.x + Math.cos(cam.baseAngle) * 80;
  state.pacoca.y = cam.y + Math.sin(cam.baseAngle) * 80;

  stepGame(state, { dx: 0, dy: 0 }, 0.2);
  assert.equal(cam.alerted, false, 'Should not alert before 0.35s');

  stepGame(state, { dx: 0, dy: 0 }, 0.2);
  assert.equal(cam.alerted, true, 'Should alert after 0.40s inside cone');
  assert.ok(state.houseAlertTimer > 0, 'House alert timer should be active');

  // Distract all humans (Stéfanny TDAH, Diego work call, Emily pirouette, Arthur skate trick, Bryan cleaning pee)
  const stefanny = state.humans.find((h) => h.id === 'stefanny');
  const diego = state.humans.find((h) => h.id === 'diego');
  const emily = state.humans.find((h) => h.id === 'emily');
  const arthur = state.humans.find((h) => h.id === 'arthur');
  const bryan = state.humans.find((h) => h.id === 'bryan');

  stefanny.mode = 'distracted';
  stefanny.distractionTimer = 4.0;
  stefanny.distractionCooldown = 10.0;
  stefanny.waterActive = false;

  diego.inCall = true;
  diego.callTimer = 4.5;
  diego.callCooldown = 12.0;

  emily.mode = 'pirouette';
  emily.pirouetteDuration = 1.4;
  emily.pirouetteTimer = 5.5;

  arthur.mode = 'trick';
  arthur.trickTimer = 1.5;
  arthur.trickCooldown = 7.0;

  const pee = { id: 'pee_test', x: 300, y: 300, radius: 14, cleanerId: 'bryan' };
  state.peePuddles.push(pee);
  bryan.mode = 'cleaning_pee';
  bryan.targetPee = pee;
  bryan.cleanTimer = 2.5;

  // Trigger a fresh camera alert
  cam.alertCooldown = 0;
  stepGame(state, { dx: 0, dy: 0 }, 0.1);

  assert.notEqual(stefanny.mode, 'distracted', 'Stéfanny must regain attention immediately on camera alert');
  assert.equal(stefanny.waterActive, true, 'Stéfanny must reactivate hose when regaining attention');
  assert.equal(diego.inCall, false, 'Diego must leave work call and regain attention on camera alert');
  assert.notEqual(emily.mode, 'pirouette', 'Emily must stop pirouette and regain attention on camera alert');
  assert.notEqual(arthur.mode, 'trick', 'Arthur must stop skate trick and regain attention on camera alert');
  assert.notEqual(bryan.mode, 'cleaning_pee', 'Human cleaning pee must regain attention on camera alert');
});

test('Emily: does ballet pirouettes, has 1.3s slow reaction, screams to alert others, then chases', () => {
  const state = createInitialState();
  const emily = state.humans.find((h) => h.id === 'emily');
  const bryan = state.humans.find((h) => h.id === 'bryan');
  assert.ok(emily, 'Emily must exist');

  // Isolate other humans so they don't interfere with Emily + Bryan test
  for (const h of state.humans) {
    if (h.id !== 'emily' && h.id !== 'bryan') {
      h.x = 720;
      h.y = 100;
      h.waypoints = [{ x: 720, y: 100 }];
    }
  }

  // Put Emily and Paçoca in Sala facing each other
  emily.x = 260;
  emily.y = 550;
  emily.angle = 0;
  emily.mode = 'patrol';
  emily.pirouetteTimer = 99; // disable pirouette during reaction test

  state.pacoca.x = 340;
  state.pacoca.y = 550;

  // Put Bryan nearby in Cozinha
  bryan.x = 220;
  bryan.y = 240;
  bryan.waypoints = [{ x: 220, y: 240 }];
  bryan.mode = 'patrol';

  // At 0.8s (< 1.3s reaction delay), Emily is still reacting and has not screamed or chased yet
  stepGame(state, { dx: 0, dy: 0 }, 0.8);
  assert.equal(emily.mode, 'reacting');
  assert.equal(bryan.mode, 'patrol');

  // Advance another 0.6s (total 1.4s > 1.3s) -> Emily screams and alerts Bryan!
  stepGame(state, { dx: 0, dy: 0 }, 0.6);
  assert.equal(emily.mode, 'screaming');
  assert.ok(emily.speech.includes('PAÇOCA'), 'Emily should scream about Paçoca');
  assert.equal(bryan.mode, 'investigate', 'Emily scream should alert nearby humans');

  // Advance 0.8s past the 0.7s scream duration -> Emily starts chasing at 0.85x speed
  const prevX = emily.x;
  stepGame(state, { dx: 0, dy: 0 }, 0.8);
  assert.equal(emily.mode, 'chase');
  assert.ok(emily.x > prevX, 'Emily should move toward Paçoca while chasing');
});

test('Diego (Pai): chases at 1.00x speed, has larger 1.4x hitbox, and disappears during work call for 5s', () => {
  const state = createInitialState();
  const diego = state.humans.find((h) => h.id === 'diego');
  assert.ok(diego);
  assert.equal(diego.chaseMultiplier, 1.0);
  assert.ok(diego.radius >= 19, 'Diego should have a 1.4x larger hitbox');

  // Trigger Diego's work call
  diego.callCooldown = 0.05;
  stepGame(state, { dx: 0, dy: 0 }, 0.1);
  assert.equal(diego.inCall, true, 'Diego should enter work call');

  // While Diego is in a work call, placing Paçoca right on Diego's coordinates must NOT capture Paçoca
  state.pacoca.x = diego.x;
  state.pacoca.y = diego.y;
  stepGame(state, { dx: 0, dy: 0 }, 0.1);
  assert.equal(state.status, 'playing', 'Diego in a work call cannot capture Paçoca');

  // After 5.0s, Diego returns from work call
  stepGame(state, { dx: 0, dy: 0 }, 5.0);
  assert.equal(diego.inCall, false, 'Diego should return after 5s call');
});

test('Stéfanny (Mãe): faster than Paçoca (1.18x), water damages hearts with 1.2s invulnerability, and TDAH/kids distract her for 4.5s', () => {
  const state = createInitialState();
  const stefanny = state.humans.find((h) => h.id === 'stefanny');
  assert.ok(stefanny);
  assert.equal(stefanny.chaseMultiplier, 1.18);

  // Move other humans away
  for (const h of state.humans) {
    if (h.id !== 'stefanny') {
      h.x = 720;
      h.y = 100;
    }
  }

  // Place a puddle under Paçoca in Garagem
  state.pacoca.x = 180;
  state.pacoca.y = 850;
  stefanny.x = 380;
  stefanny.y = 850;
  state.puddles.push({ x: 180, y: 850, radius: 30, ttl: 5.0 });

  // Frame 1: Paçoca loses 1 heart, gets slowTimer (0.8s) and invulnTimer (1.2s)
  stepGame(state, { dx: 0, dy: 0 }, 0.05);
  assert.equal(state.pacoca.hearts, 2);
  assert.ok(state.pacoca.invulnTimer > 1.0);
  assert.ok(state.pacoca.slowTimer > 0.7);

  // Frame 2 (0.1s later, still within 1.2s invulnerability): no extra heart lost!
  stepGame(state, { dx: 0, dy: 0 }, 0.1);
  assert.equal(state.pacoca.hearts, 2, 'Invulnerability window must prevent multi-frame instant drain');

  // Trigger TDAH / kids demand distraction on Stéfanny
  stefanny.distractionCooldown = 0.05;
  stepGame(state, { dx: 0, dy: 0 }, 0.1);
  assert.equal(stefanny.mode, 'distracted');
  assert.equal(stefanny.waterActive, false, 'Stéfanny turns off hose while distracted');
});

test('Bryan: roams across multiple rooms without getting stuck, hums, has 0.8s child reaction delay, and calls Mãe', () => {
  const state = createInitialState();
  const bryan = state.humans.find((h) => h.id === 'bryan');
  const stefanny = state.humans.find((h) => h.id === 'stefanny');
  const diego = state.humans.find((h) => h.id === 'diego');
  const arthur = state.humans.find((h) => h.id === 'arthur');
  const emily = state.humans.find((h) => h.id === 'emily');

  // Verify reaction delay hierarchy: Emily (1.3s) > kids Bryan/Arthur (0.8s) > adults Diego/Stéfanny (0.4s)
  assert.ok(
    emily.reactionDelay > bryan.reactionDelay &&
      bryan.reactionDelay === arthur.reactionDelay &&
      bryan.reactionDelay > diego.reactionDelay &&
      diego.reactionDelay === stefanny.reactionDelay,
    `Reaction delays must follow Emily (${emily.reactionDelay}) > Bryan/Arthur (${bryan.reactionDelay}) > Diego/Stéfanny (${diego.reactionDelay})`
  );

  // Verify Emily, Diego, and Bryan have waypoints covering both indoor rooms and the yard,
  // Arthur stays in the yard, Stéfanny always patrols the Garagem,
  // Paçoca's spawn is a blind spot where he is never captured before leaving Quarto 1,
  // and there is ALWAYS at least 1 active human inside the house on every frame!
  for (const h of [emily, diego, bryan]) {
    const hasIndoor = h.waypoints.some((wp) => wp.x > 180 && wp.y > 180 && wp.y < 706);
    const hasYard = h.waypoints.some((wp) => wp.x < 160 || wp.y < 160);
    assert.ok(hasIndoor && hasYard, `${h.name} must patrol both inside the house and in the yard`);
  }
  assert.ok(
    arthur.waypoints.every((wp) => wp.x < 160 || wp.y < 160),
    'Arthur must stay in the yard at all times'
  );
  assert.ok(
    stefanny.waypoints.every((wp) => wp.y >= 736 && wp.x < 470),
    'Stéfanny must always patrol the Garagem'
  );

  let totalDistMoved = 0;
  let prevX = bryan.x;
  let prevY = bryan.y;
  for (let i = 0; i < 400; i++) {
    stepGame(state, { dx: 0, dy: 0 }, 0.1);
    assert.equal(state.status, 'playing', `Paçoca must not be captured at spawn blind spot (frame ${i})`);
    assert.ok(stefanny.y >= 725, `Stéfanny must remain in Garagem (got y=${stefanny.y})`);

    const activeIndoorHumans = state.humans.filter(
      (h) => !h.inCall && h.x >= 160 && h.x <= 648 && h.y >= 160 && h.y <= 720
    );
    assert.ok(
      activeIndoorHumans.length >= 1,
      `At least 1 active human must be inside the house at all times (frame ${i})`
    );

    if (i < 120) {
      totalDistMoved += Math.hypot(bryan.x - prevX, bryan.y - prevY);
      prevX = bryan.x;
      prevY = bryan.y;
    }
  }
  assert.ok(totalDistMoved > 900, `Bryan should roam widely across the house (>900px in 12s), moved ${totalDistMoved}`);

  // Place Paçoca in Bryan's cone in Cozinha: verify 0.8s child reaction time before chase
  bryan.x = 250;
  bryan.y = 280;
  bryan.angle = 0;
  bryan.mode = 'patrol';
  state.pacoca.x = 320;
  state.pacoca.y = 280;

  stepGame(state, { dx: 0, dy: 0 }, 0.4);
  assert.equal(bryan.mode, 'reacting', 'Bryan should still be reacting at 0.4s (< 0.8s child reaction delay)');

  stepGame(state, { dx: 0, dy: 0 }, 0.5);
  assert.equal(bryan.mode, 'chase', 'Bryan should start chasing after 0.8s reaction delay');
  assert.equal(bryan.isHumming, false, 'Bryan stops humming when chasing');

  // Bryan calling "Mãe!" distracts Stéfanny
  bryan.mode = 'patrol';
  state.pacoca.x = state.map.spawn.x;
  state.pacoca.y = state.map.spawn.y;
  bryan.callMomCooldown = 0.02;
  stepGame(state, { dx: 0, dy: 0 }, 0.05);
  assert.equal(stefanny.mode, 'distracted', 'Bryan calling Mãe distracts Stéfanny');
});

test('Arthur: fast on skateboard but loses target after 1.2s out of sight or when doing a skate trick', () => {
  const state = createInitialState();
  const arthur = state.humans.find((h) => h.id === 'arthur');
  assert.ok(arthur);
  assert.equal(arthur.chaseMultiplier, 1.05);

  // Put Arthur in chase mode, then move Paçoca behind a solid wall (Quarto 1 spawn blind spot)
  arthur.x = 80;
  arthur.y = 300;
  arthur.mode = 'chase';
  arthur.lostSightTimer = 0;
  arthur.trickCooldown = 99;
  state.pacoca.x = state.map.spawn.x;
  state.pacoca.y = state.map.spawn.y;

  // After 1.3s without line of sight (> 1.2s threshold), Arthur gets distracted and forgets chase
  stepGame(state, { dx: 0, dy: 0 }, 1.3);
  assert.notEqual(arthur.mode, 'chase', 'Arthur should forget chase after 1.2s out of sight');
});

test('Spike: fiapo de manga same size as Paçoca, stays stationary with a circular domain radius equal to Meggie visionRange, never chases/captures, and fights Paçoca when entering domain (locks movement 0.5s, deals 1 damage, alerts humans in same room)', () => {
  const state = createInitialState();
  const spike = state.spike;
  assert.ok(spike, 'Spike must exist on state');
  assert.equal(spike.radius, state.pacoca.radius, 'Spike must be the same size as Paçoca');
  assert.equal(spike.mode, 'sleeping', 'Spike must start lying down (sleeping)');
  assert.equal(
    spike.domainRadius,
    state.meggie.visionRange,
    'Spike circular domain radius must equal Meggie visionRange (half of human vision)'
  );

  // Isolate humans: put Bryan in Sala (same room) and Emily in Quarto 2 (different room)
  const sala = state.map.rooms.find((r) => r.id === 'sala');
  const q2 = state.map.rooms.find((r) => r.id === 'quarto_2');
  for (const h of state.humans) {
    h.x = 90;
    h.y = 90;
    h.waypoints = [{ x: 90, y: 90 }];
    h.mode = 'patrol';
  }
  const bryan = state.humans.find((h) => h.id === 'bryan');
  const emily = state.humans.find((h) => h.id === 'emily');
  bryan.x = sala.x + 180;
  bryan.y = sala.y + 180;
  bryan.waypoints = [{ x: bryan.x, y: bryan.y }];
  bryan.angle = Math.PI; // looking away so vision cone doesn't trigger

  emily.x = q2.x + 60;
  emily.y = q2.y + 60;
  emily.waypoints = [{ x: emily.x, y: emily.y }];
  emily.pirouetteTimer = 99;

  // 1. Spike stays stationary in the house when Paçoca is outside his domain
  spike.x = sala.x + 60;
  spike.y = sala.y + 80;
  stepGame(state, { dx: 0, dy: 0 }, 1.0);
  assert.equal(spike.mode, 'sleeping', 'Spike must stay stationary (sleeping)');
  assert.equal(spike.x, sala.x + 60, 'Spike X must not move');
  assert.equal(spike.y, sala.y + 80, 'Spike Y must not move');

  // Put Paçoca inside Spike's circular domain radius (near the edge of domainRadius)
  spike.fightCooldown = 0;
  state.pacoca.x = spike.x + spike.domainRadius - 5;
  state.pacoca.y = spike.y;

  // 2. Entering Spike's circular domain triggers a fight: deals 1 damage, locks Paçoca for 0.5s, alerts human in same room (Bryan) but not different room (Emily)
  stepGame(state, { dx: 0, dy: 0 }, 0.05);
  assert.equal(state.status, 'playing', 'Spike must never capture Paçoca');
  assert.equal(state.pacoca.hearts, 2, 'Fight with Spike must deal 1 heart of damage to Paçoca');
  assert.ok(state.pacoca.fightTimer > 0.4, 'Paçoca movement must be locked for ~0.5s during fight');
  assert.equal(bryan.mode, 'investigate', 'Human in the same room (Sala) must be alerted by the fight');
  assert.equal(emily.mode, 'patrol', 'Human in another room (Quarto 2) must not be alerted by same-room fight');

  // 3. While fightTimer > 0 (e.g. during next 0.25s), Paçoca cannot move
  const lockedX = state.pacoca.x;
  const lockedY = state.pacoca.y;
  stepGame(state, { dx: 1, dy: 0 }, 0.25);
  assert.equal(state.pacoca.x, lockedX, 'Paçoca X must remain locked while fighting Spike');
  assert.equal(state.pacoca.y, lockedY, 'Paçoca Y must remain locked while fighting Spike');

  // 4. After the remaining 0.3s (total > 0.5s), Paçoca is unlocked and moves normally
  stepGame(state, { dx: 1, dy: 0 }, 0.35);
  assert.ok(state.pacoca.x > lockedX, 'Paçoca must be able to move again after 0.5s fight lock expires');
});

test('Meggie: small standing-ear Yorkshire that moves around the house with half of human visionRange, never chases or captures Paçoca, and barks when seeing Paçoca', () => {
  const state = createInitialState();
  const meggie = state.meggie;
  assert.ok(meggie, 'Meggie must exist on state');
  assert.ok(meggie.radius < state.pacoca.radius, 'Meggie must be smaller than Paçoca');
  assert.equal(
    meggie.visionRange,
    state.humans[0].visionRange / 2,
    'Meggie visionRange must be half of human visionRange'
  );

  // Isolate humans and Spike
  for (const h of state.humans) {
    h.x = 90;
    h.y = 90;
    h.waypoints = [{ x: 90, y: 90 }];
    h.mode = 'patrol';
  }
  if (state.spike) {
    state.spike.x = 600;
    state.spike.y = 650;
  }

  // 1. Meggie moves around the house when patrolling
  const startX = meggie.x;
  const startY = meggie.y;
  stepGame(state, { dx: 0, dy: 0 }, 0.5);
  assert.ok(
    Math.hypot(meggie.x - startX, meggie.y - startY) > 10,
    'Meggie must move around the house during patrol'
  );

  const diego = state.humans.find((h) => h.id === 'diego');
  diego.x = 240;
  diego.y = 480;
  diego.waypoints = [{ x: 240, y: 480 }];
  diego.angle = Math.PI;
  diego.callCooldown = 99;

  // 2. Meggie never captures Paçoca and barks when seeing Paçoca inside her visionRange
  meggie.x = 260;
  meggie.y = 540;
  meggie.angle = 0;
  meggie.mode = 'patrol';
  state.pacoca.x = 260 + meggie.visionRange - 10;
  state.pacoca.y = 540;

  stepGame(state, { dx: 0, dy: 0 }, 0.1);
  assert.equal(state.status, 'playing', 'Meggie must never capture Paçoca');
  assert.notEqual(meggie.mode, 'chase', 'Meggie must never chase Paçoca');
  assert.equal(meggie.mode, 'barking', 'Meggie should bark when seeing Paçoca');
  assert.ok(state.houseAlertTimer > 0, 'Meggie bark should trigger house alert');
  assert.equal(diego.mode, 'investigate', 'Meggie bark should alert nearby humans');
});

test('Paçoca pee mechanic: can only pee outside human vision cones, and humans seeing pee get distracted cleaning it', () => {
  const state = createInitialState();
  const diego = state.humans.find((h) => h.id === 'diego');
  for (const h of state.humans) {
    if (h.id !== 'diego') {
      h.x = 90;
      h.y = 90;
      h.waypoints = [{ x: 90, y: 90 }];
    }
  }

  // 1. Place Paçoca directly inside Diego's vision cone in Sala -> cannot pee while watched!
  diego.x = 250;
  diego.y = 550;
  diego.angle = 0;
  diego.mode = 'patrol';
  state.pacoca.x = 320;
  state.pacoca.y = 550;

  stepGame(state, { dx: 0, dy: 0, pee: true }, 0.05);
  assert.equal(state.peePuddles.length, 0, 'Paçoca must NOT be able to pee inside a human vision cone');

  // 2. Turn Diego away (angle = Math.PI, looking left) so Paçoca is outside all human vision cones -> can pee!
  diego.angle = Math.PI;
  diego.mode = 'patrol';
  stepGame(state, { dx: 0, dy: 0, pee: true }, 0.05);
  assert.equal(state.peePuddles.length, 1, 'Paçoca should create a pee puddle when outside human vision cones');
  assert.ok(
    Math.abs(state.pacoca.peeCooldown - 5.0) <= 0.1,
    `Pee cooldown must be 5.0s, got ${state.pacoca.peeCooldown}`
  );

  // Trying to pee again immediately while on 5s cooldown must NOT spawn a second puddle
  stepGame(state, { dx: 0, dy: 0, pee: true }, 0.05);
  assert.equal(state.peePuddles.length, 1, 'Cannot pee again before 5s cooldown finishes');

  // Move Paçoca away to safety and turn Diego back (angle = 0) so the pee puddle enters Diego's vision cone
  state.pacoca.x = state.map.spawn.x;
  state.pacoca.y = state.map.spawn.y;
  diego.angle = 0;

  stepGame(state, { dx: 0, dy: 0 }, 0.1);
  assert.equal(diego.mode, 'cleaning_pee', 'Human seeing pee puddle must become distracted cleaning it');

  // Simulate Diego walking to the pee puddle and finishing cleaning (~4.5s)
  for (let i = 0; i < 50; i++) {
    stepGame(state, { dx: 0, dy: 0 }, 0.1);
  }
  assert.equal(state.peePuddles.length, 0, 'Pee puddle should be removed after human finishes cleaning');
  assert.equal(diego.mode, 'patrol', 'Human should return to patrol after cleaning pee');
});

test('Every game start changes the house layout, yard layout, and exitGate position, and human ages are anonymized', () => {
  const states = [];
  for (let i = 0; i < 6; i++) {
    states.push(createInitialState());
  }

  for (let i = 1; i < states.length; i++) {
    const prev = states[i - 1].map;
    const curr = states[i].map;
    assert.notEqual(
      prev.layoutId,
      curr.layoutId,
      `Consecutive game starts (${i - 1} -> ${i}) must change the house layout`
    );
    assert.notEqual(
      JSON.stringify(prev.yardFeatures),
      JSON.stringify(curr.yardFeatures),
      `Consecutive game starts (${i - 1} -> ${i}) must change the yard layout`
    );
    assert.notEqual(
      `${prev.exitGate.x},${prev.exitGate.y}`,
      `${curr.exitGate.x},${curr.exitGate.y}`,
      `Consecutive game starts (${i - 1} -> ${i}) must always change the exitGate position`
    );
  }

  const uniqueGatePositions = new Set(
    states.map((s) => `${s.map.exitGate.x},${s.map.exitGate.y}`)
  );
  assert.ok(
    uniqueGatePositions.size >= 5,
    `Expected exitGate to move across at least 5 distinct places in 6 starts, got ${uniqueGatePositions.size}`
  );

  for (const h of states[0].humans) {
    assert.equal(h.age, undefined, `Human ${h.name} must not have an age property`);
    assert.ok(
      !/\b(9|10|11|28|31)\s*(a|anos)\b/i.test(`${h.name} ${h.role}`),
      `Human ${h.name} role/name must not expose age`
    );
  }
});

test('Game measures time until escape and saves records sorted by fastest time in local storage', () => {
  const mockStore = new Map();
  const mockLocalStorage = {
    getItem: (k) => (mockStore.has(k) ? mockStore.get(k) : null),
    setItem: (k, v) => mockStore.set(k, String(v)),
    removeItem: (k) => mockStore.delete(k),
  };

  clearEscapeRecords(mockLocalStorage);
  assert.equal(loadEscapeRecords(mockLocalStorage).length, 0);

  const r1 = recordEscapeWin(14.8, 'planta_02', mockLocalStorage);
  assert.equal(r1.isNewRecord, true);
  assert.equal(r1.bestTime, 14.8);

  const r2 = recordEscapeWin(9.35, 'planta_07', mockLocalStorage);
  assert.equal(r2.isNewRecord, true);
  assert.equal(r2.bestTime, 9.35);

  const saved = loadEscapeRecords(mockLocalStorage);
  assert.equal(saved.length, 2);
  assert.equal(saved[0].time, 9.35, 'Fastest escape time must be ranked #1');
  assert.equal(saved[1].time, 14.8);

  // Verify defeated runs (captured or soaked) NEVER save a record
  clearEscapeRecords(mockLocalStorage);
  assert.equal(
    recordEscapeWin(2.1, 'planta_01', mockLocalStorage, 'captured'),
    null,
    'Captured run must not become a record'
  );
  assert.equal(
    recordEscapeWin(1.8, 'planta_01', mockLocalStorage, 'soaked'),
    null,
    'Soaked run must not become a record'
  );
  assert.equal(
    loadEscapeRecords(mockLocalStorage).length,
    0,
    'No records should be saved when Paçoca does not escape'
  );

  const capturedState = createInitialState();
  const diego = capturedState.humans.find((h) => h.id === 'diego');
  diego.x = 260;
  diego.y = 480;
  capturedState.pacoca.x = 260;
  capturedState.pacoca.y = 480;
  stepGame(capturedState, { dx: 0, dy: 0 }, 0.1);
  assert.equal(capturedState.status, 'captured');
  assert.equal(capturedState.escapeTime, null, 'Captured attempt must not set escapeTime');
  assert.equal(capturedState.recordSummary, null, 'Captured attempt must not create a record');

  // Verify live game measures escapeTime ONLY when reaching exitGate
  const state = createInitialState();
  stepGame(state, { dx: 0, dy: 0 }, 3.25);
  state.pacoca.x = state.map.exitGate.x + state.map.exitGate.w / 2;
  state.pacoca.y = state.map.exitGate.y + state.map.exitGate.h / 2;
  stepGame(state, { dx: 0, dy: 0 }, 0.25);

  assert.equal(state.status, 'won');
  assert.equal(state.escapeTime, 3.5, 'Game must measure elapsed time until escape');
  assert.ok(state.recordSummary, 'Winning must record the escape time summary');
});
