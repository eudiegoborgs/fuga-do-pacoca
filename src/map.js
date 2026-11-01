const EXTRA_ROOM_CATALOG = [
  { id: 'escritorio', label: 'Escritório', short: 'Esc', type: 'office' },
  { id: 'lavanderia', label: 'Lavanderia', short: 'Lav', type: 'laundry' },
  { id: 'sala_jantar', label: 'Sala de Jantar', short: 'Jan', type: 'dining' },
  { id: 'varanda', label: 'Varanda', short: 'Var', type: 'veranda' },
  { id: 'despensa', label: 'Despensa', short: 'Des', type: 'pantry' },
  { id: 'brinquedoteca', label: 'Brinquedoteca', short: 'Bri', type: 'playroom' },
  { id: 'closet', label: 'Closet', short: 'Clo', type: 'closet' },
  { id: 'jardim_inverno', label: 'Jardim de Inverno', short: 'Jar', type: 'winter_garden' },
  { id: 'biblioteca', label: 'Biblioteca', short: 'Bib', type: 'library' },
  { id: 'copa', label: 'Copa', short: 'Cop', type: 'pantry' },
  { id: 'sala_tv', label: 'Sala de TV', short: 'TV', type: 'tv_room' },
  { id: 'edicula', label: 'Edícula Gourmet', short: 'Edi', type: 'outbuilding' },
];

const RIGHT_ORDERS_4 = [
  ['quarto_1', 'banheiro', 'quarto_2', 'quarto_3'],
  ['quarto_2', 'quarto_1', 'banheiro', 'quarto_3'],
  ['quarto_3', 'banheiro', 'quarto_1', 'quarto_2'],
  ['quarto_2', 'quarto_3', 'banheiro', 'quarto_1'],
  ['banheiro', 'quarto_1', 'quarto_3', 'quarto_2'],
  ['quarto_1', 'quarto_3', 'quarto_2', 'banheiro'],
  ['quarto_3', 'quarto_1', 'quarto_2', 'banheiro'],
  ['banheiro', 'quarto_2', 'quarto_3', 'quarto_1'],
  ['quarto_1', 'quarto_2', 'banheiro', 'quarto_3'],
  ['quarto_3', 'quarto_2', 'quarto_1', 'banheiro'],
  ['banheiro', 'quarto_3', 'quarto_1', 'quarto_2'],
  ['quarto_2', 'banheiro', 'quarto_3', 'quarto_1'],
];

const EXIT_GATE_POOL = [
  { x: 210, y: 1000, w: 180, h: 34, zone: 'garage' },
  { x: 16, y: 860, w: 76, h: 52, zone: 'garage' },
  { x: 295, y: 1000, w: 160, h: 34, zone: 'garage' },
  { x: 16, y: 575, w: 76, h: 52, zone: 'yard_left' },
  { x: 28, y: 1000, w: 155, h: 34, zone: 'garage' },
  { x: 75, y: 22, w: 105, h: 36, zone: 'yard_top' },
  { x: 16, y: 760, w: 76, h: 52, zone: 'garage' },
  { x: 485, y: 22, w: 120, h: 36, zone: 'yard_top' },
  { x: 155, y: 1000, w: 150, h: 34, zone: 'garage' },
  { x: 16, y: 135, w: 76, h: 52, zone: 'yard_left' },
];

const LAYOUT_PRESETS = Array.from({ length: 30 }, (_, i) => {
  const baseOrder = RIGHT_ORDERS_4[i % RIGHT_ORDERS_4.length];
  const hasFifthEastRoom = i % 2 === 1;
  const eastExtraDef = EXTRA_ROOM_CATALOG[i % 10];
  let rightOrder = [...baseOrder];
  if (hasFifthEastRoom) {
    const insertPos = (i % 5);
    rightOrder.splice(insertPos, 0, eastExtraDef.id);
  }

  const westMidExtraDef = EXTRA_ROOM_CATALOG[(i + 3) % 11];
  const westAuxExtraDef = EXTRA_ROOM_CATALOG[(i + 7) % 11];
  const hasYardOutbuilding = i % 3 === 0;

  const corridorX = 412 + (i % 5) * 8; // 412, 420, 428, 436, 444
  const houseRightX = 630 + (i % 4) * 6; // 630, 636, 642, 648
  const garageW = 438 + (i % 5) * 10; // 438..478
  const swapSocial = i % 2 === 1;

  const topDoorX = 212 + ((i * 19) % 145);
  const bottomDoorX = 206 + ((i * 23) % 175);
  const yardPassageX = 28 + ((i * 11) % 50);
  const dividerW = 88 + ((i * 7) % 40);

  const baseGate = EXIT_GATE_POOL[i % EXIT_GATE_POOL.length];
  const gateOffset = Math.floor(i / EXIT_GATE_POOL.length) * 8;
  const isHorizontalGate = baseGate.y === 1000 || baseGate.zone === 'yard_top';
  const exitGate = {
    x: isHorizontalGate ? baseGate.x + gateOffset : baseGate.x,
    y: !isHorizontalGate ? baseGate.y + gateOffset : baseGate.y,
    w: baseGate.w,
    h: baseGate.h,
    zone: baseGate.zone,
  };

  const flowerbedIsTop = i % 2 === 1;
  const flowerbed = flowerbedIsTop
    ? { x: 195 + ((i * 17) % 190), y: 22, w: 82 + (i % 3) * 8, h: 26 }
    : { x: 22, y: 215 + ((i * 29) % 250), w: 28, h: 80 + (i % 3) * 8 };

  const doghouseX = flowerbedIsTop ? 515 + (i % 3) * 18 : 200 + ((i * 31) % 310);

  return {
    id: `planta_${String(i + 1).padStart(2, '0')}`,
    rightOrder,
    hasFifthEastRoom,
    eastExtraDef,
    westMidExtraDef,
    westAuxExtraDef,
    hasYardOutbuilding,
    corridorX,
    houseRightX,
    garageW,
    swapSocial,
    topDoorX,
    bottomDoorX,
    yardPassageX,
    exitGate,
    dividerW,
    yardFeatures: {
      doghouse: { x: doghouseX, y: 24, w: 48, h: 40 },
      flowerbed,
      pool: {
        x: houseRightX + 58,
        y: 150 + ((i * 37) % 380),
        r: 28 + (i % 3) * 4,
      },
      plants: [
        [36, 165 + (i % 4) * 18],
        [36, 485 + (i % 4) * 20],
        [195 + (i % 5) * 45, 34],
        [houseRightX + 48, 85 + (i % 4) * 25],
        [houseRightX + 48, 530 + (i % 3) * 25],
      ],
    },
    yardTopSkateX: 555 + (i % 5) * 10,
    yardBottomSkateY: 640 + (i % 4) * 8,
  };
});

let lastLayoutIndex = -1;
let layoutBag = [];

export const MAP_CONFIG = {
  width: 800,
  height: 1050,
  layoutId: 'layout_0',
  spawn: { x: 518, y: 215 },
  exitGate: { x: 210, y: 1000, w: 190, h: 34, label: 'Portão (saída)' },
  rooms: [],
  doors: [],
  walls: [],
  cameras: [],
  houseAndYardCircuit: [],
  indoorEscapePath: [],
  yardEscapePath: [],
};

export function generateHouseLayout(variantIndex = null) {
  let idx;
  if (typeof variantIndex === 'number' && variantIndex >= 0) {
    idx = variantIndex % LAYOUT_PRESETS.length;
  } else {
    if (layoutBag.length === 0) {
      layoutBag = LAYOUT_PRESETS.map((_, i) => i);
      for (let i = layoutBag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [layoutBag[i], layoutBag[j]] = [layoutBag[j], layoutBag[i]];
      }
      if (layoutBag[0] === lastLayoutIndex && layoutBag.length > 1) {
        [layoutBag[0], layoutBag[1]] = [layoutBag[1], layoutBag[0]];
      }
    }
    idx = layoutBag.shift();
  }
  lastLayoutIndex = idx;

  const preset = LAYOUT_PRESETS[idx];
  const corridorX = preset.corridorX;
  const corridorRightX = corridorX + 42;
  const houseRightX = preset.houseRightX;
  const rightWallX = houseRightX + 14;
  const westWingW = corridorX - 190;

  const topSocialRoom = preset.swapSocial
    ? { id: 'sala', label: 'Sala', x: 190, y: 190, w: westWingW, h: 240, type: 'indoor' }
    : { id: 'cozinha', label: 'Cozinha', x: 190, y: 190, w: westWingW, h: 240, type: 'indoor' };
  const bottomSocialRoom = preset.swapSocial
    ? { id: 'cozinha', label: 'Cozinha', x: 190, y: 446, w: westWingW, h: 260, type: 'indoor' }
    : { id: 'sala', label: 'Sala', x: 190, y: 446, w: westWingW, h: 260, type: 'indoor' };

  const rooms = [
    { id: 'quintal_esq', label: 'Quintal', x: 16, y: 16, w: 144, h: 704, type: 'yard' },
    { id: 'quintal_topo', label: 'Quintal', x: 160, y: 16, w: rightWallX - 160, h: 144, type: 'yard' },
    {
      id: 'quintal_dir',
      label: 'Quintal',
      x: rightWallX + 16,
      y: 16,
      w: 784 - (rightWallX + 16),
      h: 704,
      type: 'yard_closed',
    },
    topSocialRoom,
    bottomSocialRoom,
    // Extra room carved into the West-Center annex
    {
      id: preset.westMidExtraDef.id,
      label: preset.westMidExtraDef.label,
      short: preset.westMidExtraDef.short,
      x: 190,
      y: 356,
      w: preset.dividerW,
      h: 74,
      type: preset.westMidExtraDef.type,
    },
    // Extra room carved into the West-South or North-East annex
    {
      id: preset.westAuxExtraDef.id,
      label: preset.westAuxExtraDef.label,
      short: preset.westAuxExtraDef.short,
      x: 190,
      y: 642,
      w: Math.min(118, preset.bottomDoorX - 194),
      h: 64,
      type: preset.westAuxExtraDef.type,
    },
    {
      id: 'ambiente_conectado',
      label: 'Ambiente conectado',
      x: 190 + preset.dividerW,
      y: 390,
      w: corridorRightX - (190 + preset.dividerW),
      h: 100,
      type: 'indoor',
    },
    { id: 'corredor', label: '', x: corridorX, y: 190, w: 42, h: 516, type: 'indoor' },
  ];

  if (preset.hasYardOutbuilding) {
    rooms.push({
      id: 'edicula',
      label: 'Edícula Gourmet',
      short: 'Edi',
      x: rightWallX + 20,
      y: 26,
      w: 778 - (rightWallX + 20),
      h: 110,
      type: 'outbuilding',
    });
  }

  const doors = [
    {
      id: 'porta_sala_garagem',
      label: 'Porta',
      x: preset.bottomDoorX,
      y: 706,
      w: 54,
      h: 30,
      orientation: 'vertical',
    },
    {
      id: 'porta_cozinha_quintal',
      label: 'Porta',
      x: preset.topDoorX,
      y: 160,
      w: 60,
      h: 30,
      orientation: 'horizontal',
    },
    {
      id: 'passagem_quintal_garagem',
      label: 'Passagem',
      x: preset.yardPassageX,
      y: 720,
      w: 68,
      h: 16,
      orientation: 'horizontal',
    },
  ];

  const walls = [
    // Outer map boundaries
    { x: 0, y: 0, w: 800, h: 16 },
    { x: 0, y: 1034, w: 800, h: 16 },
    { x: 0, y: 0, w: 16, h: 1050 },
    { x: 784, y: 0, w: 16, h: 1050 },

    // Right Quintal separator wall
    { x: rightWallX, y: 16, w: 16, h: 720 },

    // House top exterior wall (with doorway at topDoorX..topDoorX+60)
    { x: 174, y: 160, w: preset.topDoorX - 174, h: 30 },
    { x: preset.topDoorX + 60, y: 160, w: rightWallX - (preset.topDoorX + 60), h: 30 },

    // House left exterior wall
    { x: 160, y: 160, w: 30, h: 560 },

    // Divider between Quintal Esquerdo and Garagem (with passage at yardPassageX..yardPassageX+68)
    { x: 16, y: 720, w: preset.yardPassageX - 16, h: 16 },
    { x: preset.yardPassageX + 68, y: 720, w: 160 - (preset.yardPassageX + 68), h: 16 },

    // Physical Flowerbed obstacle in Yard (changes position per layout)
    {
      x: preset.yardFeatures.flowerbed.x,
      y: preset.yardFeatures.flowerbed.y,
      w: preset.yardFeatures.flowerbed.w,
      h: preset.yardFeatures.flowerbed.h,
      isYardObstacle: true,
    },

    // House bottom exterior wall (with doorway at bottomDoorX..bottomDoorX+54)
    { x: 160, y: 706, w: preset.bottomDoorX - 160, h: 30 },
    { x: preset.bottomDoorX + 54, y: 706, w: rightWallX - (preset.bottomDoorX + 54), h: 30 },

    // Partial wall between top and bottom social rooms
    { x: 190, y: 430, w: preset.dividerW, h: 16 },
  ];

  const rightRoomHeights = preset.hasFifthEastRoom
    ? {
        quarto_1: 112,
        quarto_2: 102,
        quarto_3: 102,
        banheiro: 72,
        [preset.eastExtraDef.id]: 64,
      }
    : {
        quarto_1: 132,
        quarto_2: 126,
        quarto_3: 126,
        banheiro: 84,
      };

  let curY = 190;
  let spawn = { x: corridorRightX + 36, y: 215 };
  let q1DoorCenterY = 283;
  const eastRoomW = houseRightX - corridorRightX;

  for (let i = 0; i < preset.rightOrder.length; i++) {
    const rId = preset.rightOrder[i];
    const rH = rightRoomHeights[rId];

    if (rId === 'quarto_1') {
      const doorYOffset = rH >= 120 ? 52 : 44;
      const doorH = 56;
      rooms.push({ id: 'quarto_1', label: 'Quarto', x: corridorRightX, y: curY, w: eastRoomW, h: rH, type: 'bedroom' });
      doors.push({
        id: 'porta_quarto_1',
        label: 'Porta',
        x: corridorRightX - 8,
        y: curY + doorYOffset,
        w: 18,
        h: doorH,
        orientation: 'vertical',
      });
      walls.push({ x: corridorRightX, y: curY, w: 12, h: doorYOffset });
      walls.push({
        x: corridorRightX,
        y: curY + doorYOffset + doorH,
        w: 12,
        h: Math.max(4, rH - (doorYOffset + doorH)),
      });
      spawn = { x: corridorRightX + 36, y: curY + 22 };
      q1DoorCenterY = curY + doorYOffset + doorH / 2;
    } else if (rId === 'quarto_2' || rId === 'quarto_3') {
      rooms.push({ id: rId, label: 'Quarto', x: corridorRightX, y: curY, w: eastRoomW, h: rH, type: 'bedroom' });
      doors.push({
        id: `porta_${rId}`,
        label: 'Porta',
        x: corridorRightX - 8,
        y: curY + 10,
        w: 18,
        h: 54,
        orientation: 'vertical',
      });
      walls.push({ x: corridorRightX, y: curY, w: 12, h: 10 });
      walls.push({ x: corridorRightX, y: curY + 64, w: 12, h: Math.max(6, rH - 64) });
    } else if (rId === 'banheiro') {
      rooms.push({
        id: 'banheiro',
        label: 'Banheiro',
        x: corridorRightX + 14,
        y: curY,
        w: eastRoomW - 14,
        h: rH,
        type: 'bathroom',
      });
      doors.push({
        id: 'porta_banheiro',
        label: 'Porta',
        x: corridorRightX,
        y: curY + 10,
        w: 26,
        h: Math.min(52, rH - 20),
        orientation: 'horizontal',
      });
      walls.push({ x: corridorRightX + 10, y: curY, w: 10, h: 10 });
      walls.push({
        x: corridorRightX + 10,
        y: curY + 10 + Math.min(52, rH - 20),
        w: 10,
        h: Math.max(6, rH - 10 - Math.min(52, rH - 20)),
      });
    } else {
      // 5th East Wing extra room (Escritório, Lavanderia, Closet, Despensa, etc.)
      rooms.push({
        id: preset.eastExtraDef.id,
        label: preset.eastExtraDef.label,
        short: preset.eastExtraDef.short,
        x: corridorRightX,
        y: curY,
        w: eastRoomW,
        h: rH,
        type: preset.eastExtraDef.type,
      });
      doors.push({
        id: `porta_${preset.eastExtraDef.id}`,
        label: 'Porta',
        x: corridorRightX - 8,
        y: curY + 8,
        w: 18,
        h: Math.min(48, rH - 16),
        orientation: 'vertical',
      });
      walls.push({ x: corridorRightX, y: curY, w: 12, h: 8 });
      walls.push({
        x: corridorRightX,
        y: curY + 8 + Math.min(48, rH - 16),
        w: 12,
        h: Math.max(6, rH - 8 - Math.min(48, rH - 16)),
      });
    }

    if (i < preset.rightOrder.length - 1) {
      walls.push({ x: corridorRightX, y: curY + rH, w: eastRoomW + 14, h: 16 });
    }
    curY += rH + 16;
  }

  const blockedX = 16 + preset.garageW;
  rooms.push(
    { id: 'garagem', label: 'Garagem', x: 16, y: 736, w: preset.garageW, h: 298, type: 'garage' },
    {
      id: 'area_nao_acessivel',
      label: 'Área não acessível',
      x: blockedX,
      y: 736,
      w: 784 - blockedX,
      h: 298,
      type: 'blocked',
    }
  );
  walls.push({ x: blockedX, y: 736, w: 784 - blockedX, h: 298, isBlockedZone: true });

  const exitGate = {
    x: preset.exitGate.x,
    y: preset.exitGate.y,
    w: preset.exitGate.w,
    h: preset.exitGate.h,
    zone: preset.exitGate.zone,
    label: 'Portão (saída)',
  };

  const cameras = [
    {
      id: 'cam_quintal_sup_esq',
      label: 'Câm 1 (Esquina Sup. Esq.)',
      x: 32,
      y: 32,
      baseAngle: Math.PI / 4,
      sweepAngle: 0.55,
      speed: 1.2,
      fov: 0.65,
      range: 240,
    },
    {
      id: 'cam_quintal_sup_dir',
      label: 'Câm 2 (Esquina Sup. Dir.)',
      x: 630,
      y: 32,
      baseAngle: (3 * Math.PI) / 4,
      sweepAngle: 0.55,
      speed: 1.15,
      fov: 0.65,
      range: 250,
    },
    {
      id: 'cam_quintal_inf_esq',
      label: 'Câm 3 (Esquina Inf. Esq.)',
      x: 32,
      y: 702,
      baseAngle: -Math.PI / 4,
      sweepAngle: 0.55,
      speed: 1.35,
      fov: 0.65,
      range: 230,
    },
    {
      id: 'cam_quintal_inf_dir',
      label: 'Câm 4 (Esquina Inf. Dir.)',
      x: 452,
      y: 752,
      baseAngle: (3 * Math.PI) / 4,
      sweepAngle: 0.58,
      speed: 1.25,
      fov: 0.65,
      range: 235,
    },
  ];

  const topDoorCenterX = preset.topDoorX + 30;
  const bottomDoorCenterX = preset.bottomDoorX + 27;
  const yardPassageCenterX = preset.yardPassageX + 34;
  const corridorCenterX = corridorX + 20;
  const q1ApproachX = corridorRightX + 38;
  const gateCenterX = exitGate.x + exitGate.w / 2;
  const gateCenterY = exitGate.y + exitGate.h / 2;

  const houseAndYardCircuit = [
    { x: bottomDoorCenterX, y: 580 },
    { x: 270, y: 580 },
    { x: bottomDoorCenterX, y: 650 },
    { x: bottomDoorCenterX, y: 780 },
    { x: yardPassageCenterX, y: 780 },
    { x: yardPassageCenterX, y: 660 },
    { x: 90, y: 95 },
    { x: topDoorCenterX, y: 95 },
    { x: topDoorCenterX, y: 260 },
    { x: 375, y: 340 },
    { x: corridorCenterX, y: 310 },
    { x: corridorCenterX, y: 610 },
    { x: 390, y: 440 },
  ];

  const yardWaypoints = [
    { x: 90, y: 85 },
    { x: yardPassageCenterX, y: preset.yardBottomSkateY },
    { x: 90, y: 85 },
    { x: preset.yardTopSkateX, y: 85 },
  ];

  let indoorEscapePath;
  let yardEscapePath;

  if (exitGate.zone === 'garage') {
    indoorEscapePath = [
      { x: q1ApproachX, y: q1DoorCenterY },
      { x: corridorCenterX, y: q1DoorCenterY },
      { x: corridorCenterX, y: 580 },
      { x: bottomDoorCenterX, y: 650 },
      { x: bottomDoorCenterX, y: 780 },
      { x: gateCenterX, y: gateCenterY },
    ];
    yardEscapePath = [
      { x: q1ApproachX, y: q1DoorCenterY },
      { x: corridorCenterX, y: q1DoorCenterY },
      { x: corridorCenterX, y: 260 },
      { x: topDoorCenterX, y: 260 },
      { x: topDoorCenterX, y: 100 },
      { x: 90, y: 100 },
      { x: yardPassageCenterX, y: 780 },
      { x: gateCenterX, y: gateCenterY },
    ];
  } else if (exitGate.zone === 'yard_left') {
    indoorEscapePath = [
      { x: q1ApproachX, y: q1DoorCenterY },
      { x: corridorCenterX, y: q1DoorCenterY },
      { x: corridorCenterX, y: 580 },
      { x: bottomDoorCenterX, y: 650 },
      { x: bottomDoorCenterX, y: 780 },
      { x: yardPassageCenterX, y: 780 },
      { x: 90, y: gateCenterY },
      { x: gateCenterX, y: gateCenterY },
    ];
    yardEscapePath = [
      { x: q1ApproachX, y: q1DoorCenterY },
      { x: corridorCenterX, y: q1DoorCenterY },
      { x: corridorCenterX, y: 260 },
      { x: topDoorCenterX, y: 260 },
      { x: topDoorCenterX, y: 100 },
      { x: 90, y: 100 },
      { x: 90, y: gateCenterY },
      { x: gateCenterX, y: gateCenterY },
    ];
  } else {
    // yard_top
    indoorEscapePath = [
      { x: q1ApproachX, y: q1DoorCenterY },
      { x: corridorCenterX, y: q1DoorCenterY },
      { x: corridorCenterX, y: 580 },
      { x: bottomDoorCenterX, y: 650 },
      { x: bottomDoorCenterX, y: 780 },
      { x: yardPassageCenterX, y: 780 },
      { x: 90, y: 100 },
      { x: gateCenterX, y: 100 },
      { x: gateCenterX, y: gateCenterY },
    ];
    yardEscapePath = [
      { x: q1ApproachX, y: q1DoorCenterY },
      { x: corridorCenterX, y: q1DoorCenterY },
      { x: corridorCenterX, y: 260 },
      { x: topDoorCenterX, y: 260 },
      { x: topDoorCenterX, y: 100 },
      { x: gateCenterX, y: 100 },
      { x: gateCenterX, y: gateCenterY },
    ];
  }

  const layout = {
    width: 800,
    height: 1050,
    layoutId: preset.id,
    spawn,
    exitGate,
    rooms,
    doors,
    walls,
    cameras,
    yardFeatures: preset.yardFeatures,
    yardWaypoints,
    houseAndYardCircuit,
    indoorEscapePath,
    yardEscapePath,
  };

  Object.assign(MAP_CONFIG, layout);
  return layout;
}

generateHouseLayout(0);

export function circleIntersectsRect(cx, cy, radius, rect) {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < radius * radius;
}

export function resolveWallCollisions(x, y, radius, walls) {
  let cx = Math.max(16 + radius, Math.min(MAP_CONFIG.width - 16 - radius, x));
  let cy = Math.max(16 + radius, Math.min(MAP_CONFIG.height - 16 - radius, y));

  for (let pass = 0; pass < 3; pass++) {
    for (const wall of walls) {
      const closestX = Math.max(wall.x, Math.min(cx, wall.x + wall.w));
      const closestY = Math.max(wall.y, Math.min(cy, wall.y + wall.h));
      const dx = cx - closestX;
      const dy = cy - closestY;
      const distSq = dx * dx + dy * dy;

      if (distSq < radius * radius) {
        if (distSq > 1e-6) {
          const dist = Math.sqrt(distSq);
          const overlap = radius - dist;
          cx += (dx / dist) * overlap;
          cy += (dy / dist) * overlap;
        } else {
          const leftPen = cx - wall.x;
          const rightPen = wall.x + wall.w - cx;
          const topPen = cy - wall.y;
          const bottomPen = wall.y + wall.h - cy;
          const minPen = Math.min(leftPen, rightPen, topPen, bottomPen);
          if (minPen === leftPen) cx = wall.x - radius;
          else if (minPen === rightPen) cx = wall.x + wall.w + radius;
          else if (minPen === topPen) cy = wall.y - radius;
          else cy = wall.y + wall.h + radius;
        }
      }
    }
    cx = Math.max(16 + radius, Math.min(MAP_CONFIG.width - 16 - radius, cx));
    cy = Math.max(16 + radius, Math.min(MAP_CONFIG.height - 16 - radius, cy));
  }

  return { x: cx, y: cy };
}

function segmentsIntersect(p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y) {
  const s1x = p1x - p0x;
  const s1y = p1y - p0y;
  const s2x = p3x - p2x;
  const s2y = p3y - p2y;
  const denom = -s2x * s1y + s1x * s2y;
  if (Math.abs(denom) < 1e-9) return false;
  const s = (-s1y * (p0x - p2x) + s1x * (p0y - p2y)) / denom;
  const t = (s2x * (p0y - p2y) - s2y * (p0x - p2x)) / denom;
  return s >= 0 && s <= 1 && t >= 0 && t <= 1;
}

function segmentIntersectsRect(x1, y1, x2, y2, rect) {
  if (
    x1 >= rect.x &&
    x1 <= rect.x + rect.w &&
    y1 >= rect.y &&
    y1 <= rect.y + rect.h
  ) {
    return true;
  }
  if (
    x2 >= rect.x &&
    x2 <= rect.x + rect.w &&
    y2 >= rect.y &&
    y2 <= rect.y + rect.h
  ) {
    return true;
  }
  const rx = rect.x;
  const ry = rect.y;
  const rw = rect.w;
  const rh = rect.h;
  return (
    segmentsIntersect(x1, y1, x2, y2, rx, ry, rx + rw, ry) ||
    segmentsIntersect(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh) ||
    segmentsIntersect(x1, y1, x2, y2, rx + rw, ry + rh, rx, ry + rh) ||
    segmentsIntersect(x1, y1, x2, y2, rx, ry + rh, rx, ry)
  );
}

export function hasLineOfSight(x1, y1, x2, y2, walls) {
  for (const wall of walls) {
    if (segmentIntersectsRect(x1, y1, x2, y2, wall)) {
      return false;
    }
  }
  return true;
}

export function normalizeAngle(angle) {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function isPointInCone(px, py, cx, cy, angleRad, fovRad, range, walls) {
  const dx = px - cx;
  const dy = py - cy;
  const distSq = dx * dx + dy * dy;
  if (distSq > range * range) return false;
  if (distSq < 1e-4) return true;

  const targetAngle = Math.atan2(dy, dx);
  const diff = Math.abs(normalizeAngle(targetAngle - angleRad));
  if (diff > fovRad / 2) return false;

  return hasLineOfSight(cx, cy, px, py, walls);
}

function rayIntersectsRectDistance(ox, oy, dx, dy, rect, maxDist) {
  let tmin = 0;
  let tmax = maxDist;

  if (Math.abs(dx) < 1e-9) {
    if (ox < rect.x || ox > rect.x + rect.w) return null;
  } else {
    const invX = 1 / dx;
    let t1 = (rect.x - ox) * invX;
    let t2 = (rect.x + rect.w - ox) * invX;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }

  if (Math.abs(dy) < 1e-9) {
    if (oy < rect.y || oy > rect.y + rect.h) return null;
  } else {
    const invY = 1 / dy;
    let t1 = (rect.y - oy) * invY;
    let t2 = (rect.y + rect.h - oy) * invY;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }

  return tmin >= 0 && tmin <= maxDist ? tmin : null;
}

export function computeVisibilityPolygon(originX, originY, maxRadius, walls, rayCount = 96) {
  const points = [];
  for (let i = 0; i < rayCount; i++) {
    const angle = (i * Math.PI * 2) / rayCount;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let closest = maxRadius;

    for (const wall of walls) {
      const dist = rayIntersectsRectDistance(originX, originY, dx, dy, wall, closest);
      if (dist !== null && dist < closest) {
        closest = dist;
      }
    }

    points.push({
      x: originX + dx * closest,
      y: originY + dy * closest,
    });
  }
  return points;
}

export function isPointVisibleToPacoca(px, py, pacocaX, pacocaY, maxRadius, walls) {
  const dist = Math.hypot(px - pacocaX, py - pacocaY);
  if (dist > maxRadius) return false;
  return hasLineOfSight(pacocaX, pacocaY, px, py, walls);
}
