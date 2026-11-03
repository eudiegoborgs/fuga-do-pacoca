/**
 * Fábrica de Entidades do Domínio (Paçoca, Cães da Casa, Câmeras e Humanos da Família).
 * Público-alvo: Desenvolvedores que ajustam atributos de balanceamento, velocidade,
 * raios de visão e circuitos iniciais de patrulha.
 */
import {
  HUMAN_VISION_RANGE,
  MEGGIE_VISION_RANGE,
  SPIKE_DOMAIN_RADIUS,
  PEE_COOLDOWN_SECONDS,
} from '../../config/game-config.js';
import {
  ModoDoHumano,
  ModoDoCao,
} from '../partida-states.js';

export function rotateCircuit(circuitWaypoints, startIndex) {
  return [
    ...circuitWaypoints.slice(startIndex),
    ...circuitWaypoints.slice(0, startIndex),
  ];
}

export function createPacocaEntity(spawnPoint) {
  return {
    x: spawnPoint.x,
    y: spawnPoint.y,
    radius: 12,
    angle: Math.PI,
    hearts: 3,
    maxHearts: 3,
    invulnTimer: 0,
    slowTimer: 0,
    fightTimer: 0,
    peeCooldown: 0,
    peeMaxCooldown: PEE_COOLDOWN_SECONDS,
    peeingTimer: 0,
    furShakePhase: 0,
    isMoving: false,
  };
}

export function createSecurityCameras(cameraConfigs) {
  return cameraConfigs.map((cameraConfig) => ({
    ...cameraConfig,
    angle: cameraConfig.baseAngle,
    sweepSpeed: cameraConfig.speed,
    exposure: 0,
    alerted: false,
    alertCooldown: 0,
  }));
}

export function createHouseDogs(floorplan) {
  const circuit = floorplan.houseAndYardCircuit;
  const quarto2 = floorplan.rooms.find((room) => room.id === 'quarto_2');
  const quarto3 = floorplan.rooms.find((room) => room.id === 'quarto_3');
  const cozinha = floorplan.rooms.find((room) => room.id === 'cozinha');
  const sala = floorplan.rooms.find((room) => room.id === 'sala');

  const spikeRestingSpots = [
    { x: quarto2 ? quarto2.x + 85 : 565, y: quarto2 ? quarto2.y + 88 : 530 },
    { x: quarto3 ? quarto3.x + 85 : 565, y: quarto3 ? quarto3.y + 88 : 665 },
    { x: cozinha ? cozinha.x + 70 : 260, y: cozinha ? cozinha.y + 95 : 285 },
    { x: sala ? sala.x + 75 : 265, y: sala ? sala.y + 190 : 635 },
  ];

  const spike = {
    id: 'spike',
    name: 'Spike',
    role: 'Cão (Parado / Área de Domínio)',
    color: '#d97706',
    x: spikeRestingSpots[0].x,
    y: spikeRestingSpots[0].y,
    radius: 12,
    domainRadius: SPIKE_DOMAIN_RADIUS,
    isStationary: true,
    angle: 0,
    mode: ModoDoCao.DEITADO_EM_DOMINIO,
    isLyingDown: true,
    fightTimer: 0,
    fightCooldown: 0,
    spotIndex: 0,
    spots: spikeRestingSpots,
    statusLabel: 'Parado (Área de Domínio) 💤',
    speech: '',
    speechTimer: 0,
  };

  const corridorCenterX = circuit[10]?.x || 460;
  const quarto2DoorY = quarto2 ? quarto2.y + 36 : 480;
  const quarto3DoorY = quarto3 ? quarto3.y + 36 : 620;
  const meggieIndoorCircuit = [
    { x: 265, y: 300 },
    { x: 375, y: 330 },
    { x: corridorCenterX, y: 330 },
    { x: corridorCenterX, y: quarto2DoorY },
    { x: quarto2 ? quarto2.x + 55 : corridorCenterX + 55, y: quarto2DoorY },
    { x: corridorCenterX, y: quarto2DoorY },
    { x: corridorCenterX, y: quarto3DoorY },
    { x: quarto3 ? quarto3.x + 55 : corridorCenterX + 55, y: quarto3DoorY },
    { x: corridorCenterX, y: quarto3DoorY },
    { x: corridorCenterX, y: 585 },
    { x: 270, y: 585 },
    { x: 375, y: 440 },
  ];

  const meggie = {
    id: 'meggie',
    name: 'Meggie',
    role: 'Yorkshire Pequena (Anda pela Casa)',
    color: '#eab308',
    x: meggieIndoorCircuit[0].x,
    y: meggieIndoorCircuit[0].y,
    radius: 9,
    angle: 0,
    fov: 0.95,
    visionRange: MEGGIE_VISION_RANGE,
    patrolMultiplier: 0.68,
    mode: ModoDoCao.RONDA_PELA_CASA,
    barkTimer: 0,
    barkCooldown: 0,
    waypointIndex: 1,
    waypoints: meggieIndoorCircuit,
    statusLabel: 'Andando pela casa 🐾',
    speech: '',
    speechTimer: 0,
  };

  return { spike, meggie, dogs: [spike, meggie] };
}

export function createFamilyHumans(floorplan) {
  const circuit = floorplan.houseAndYardCircuit;

  return [
    {
      id: 'emily',
      name: 'Emily',
      role: 'Irmã (Balé / Patins)',
      color: '#ec4899',
      x: 270,
      y: 580,
      radius: 14,
      angle: -Math.PI / 2,
      fov: 0.95,
      visionRange: HUMAN_VISION_RANGE,
      patrolMultiplier: 0.72,
      chaseMultiplier: 0.85,
      reactionDelay: 1.3,
      mode: ModoDoHumano.PATRULHA,
      statusLabel: 'Patinando 🛼',
      speech: '',
      speechTimer: 0,
      reactionTimer: 0,
      screamTimer: 0,
      pirouetteTimer: 5.5,
      pirouetteDuration: 0,
      lostSightTimer: 0,
      investigateTarget: null,
      waypointIndex: 0,
      waypoints: rotateCircuit(circuit, 1),
    },
    {
      id: 'diego',
      name: 'Diego',
      role: 'Pai (Forte / Calls)',
      color: '#3b82f6',
      x: circuit[8].x,
      y: circuit[8].y,
      radius: 20,
      angle: 0,
      fov: 1.0,
      visionRange: HUMAN_VISION_RANGE,
      patrolMultiplier: 0.65,
      chaseMultiplier: 1.0,
      reactionDelay: 0.4,
      mode: ModoDoHumano.PATRULHA,
      statusLabel: 'Falando sozinho 💭',
      speech: 'Hmm, preciso revisar aquele código...',
      speechTimer: 3.0,
      reactionTimer: 0,
      inCall: false,
      callTimer: 0,
      callCooldown: 12.0,
      lostSightTimer: 0,
      investigateTarget: null,
      waypointIndex: 0,
      waypoints: rotateCircuit(circuit, 8),
    },
    {
      id: 'stefanny',
      name: 'Stéfanny',
      role: 'Mãe (Chefe / Na Garagem)',
      color: '#a855f7',
      x: 250,
      y: 860,
      radius: 15,
      angle: -Math.PI / 2,
      fov: 1.05,
      visionRange: HUMAN_VISION_RANGE,
      patrolMultiplier: 0.75,
      chaseMultiplier: 1.18,
      reactionDelay: 0.4,
      stayInGarage: true,
      mode: ModoDoHumano.PATRULHA,
      statusLabel: 'Rondando a Garagem 💦',
      speech: '',
      speechTimer: 0,
      reactionTimer: 0,
      waterActive: true,
      waterRange: 130,
      puddleSpawnTimer: 1.2,
      distractionCooldown: 9.5,
      distractionTimer: 0,
      lostSightTimer: 0,
      investigateTarget: null,
      waypointIndex: 0,
      waypoints: [
        { x: 110, y: 820 },
        { x: 405, y: 810 },
        { x: 375, y: 945 },
        { x: 130, y: 940 },
      ],
    },
    {
      id: 'bryan',
      name: 'Bryan',
      role: 'Irmão (Cantarolando)',
      color: '#10b981',
      x: 458,
      y: 520,
      radius: 13,
      angle: -Math.PI / 2,
      fov: 0.95,
      visionRange: HUMAN_VISION_RANGE,
      patrolMultiplier: 0.82,
      chaseMultiplier: 0.92,
      reactionDelay: 0.8,
      mode: ModoDoHumano.PATRULHA,
      statusLabel: 'Cantarolando 🎵',
      speech: '♪ ♫ ♪',
      speechTimer: 99,
      reactionTimer: 0,
      isHumming: true,
      notePhase: 0,
      callMomCooldown: 12.5,
      lostSightTimer: 0,
      investigateTarget: null,
      waypointIndex: 0,
      waypoints: rotateCircuit(circuit, 11),
    },
    {
      id: 'arthur',
      name: 'Arthur',
      role: 'Irmão (Skate no Quintal)',
      color: '#f59e0b',
      x: 450,
      y: 85,
      radius: 13,
      angle: Math.PI,
      fov: 0.9,
      visionRange: HUMAN_VISION_RANGE,
      patrolMultiplier: 0.95,
      chaseMultiplier: 1.05,
      reactionDelay: 0.8,
      stayInYard: true,
      mode: ModoDoHumano.PATRULHA,
      statusLabel: 'Skate no Quintal 🛹',
      speech: '',
      speechTimer: 0,
      reactionTimer: 0,
      trickCooldown: 6.5,
      trickTimer: 0,
      lostSightTimer: 0,
      investigateTarget: null,
      waypointIndex: 0,
      waypoints: floorplan.yardWaypoints.map((waypoint) => ({ ...waypoint })),
    },
  ];
}
