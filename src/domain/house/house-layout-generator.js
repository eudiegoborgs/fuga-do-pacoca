/**
 * Serviço de Domínio Gerador de Planta Baixa (PlantaBaixa / MAP_CONFIG).
 */
import { LAYOUT_PRESETS } from './floorplan-catalog.js';
import { MAP_DIMENSIONS } from '../geometry/spatial-vision.js';

let lastLayoutIndex = -1;
let layoutBag = [];

export const MAP_CONFIG = {
  width: MAP_DIMENSIONS.width,
  height: MAP_DIMENSIONS.height,
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
    { x: 0, y: 0, w: 800, h: 16 },
    { x: 0, y: 1034, w: 800, h: 16 },
    { x: 0, y: 0, w: 16, h: 1050 },
    { x: 784, y: 0, w: 16, h: 1050 },
    { x: rightWallX, y: 16, w: 16, h: 720 },
    { x: 174, y: 160, w: preset.topDoorX - 174, h: 30 },
    { x: preset.topDoorX + 60, y: 160, w: rightWallX - (preset.topDoorX + 60), h: 30 },
    { x: 160, y: 160, w: 30, h: 560 },
    { x: 16, y: 720, w: preset.yardPassageX - 16, h: 16 },
    { x: preset.yardPassageX + 68, y: 720, w: 160 - (preset.yardPassageX + 68), h: 16 },
    {
      x: preset.yardFeatures.flowerbed.x,
      y: preset.yardFeatures.flowerbed.y,
      w: preset.yardFeatures.flowerbed.w,
      h: preset.yardFeatures.flowerbed.h,
      isYardObstacle: true,
    },
    { x: 160, y: 706, w: preset.bottomDoorX - 160, h: 30 },
    { x: preset.bottomDoorX + 54, y: 706, w: rightWallX - (preset.bottomDoorX + 54), h: 30 },
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
    width: MAP_DIMENSIONS.width,
    height: MAP_DIMENSIONS.height,
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
