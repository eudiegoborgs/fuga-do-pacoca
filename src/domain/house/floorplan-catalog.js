/**
 * Catálogo de Cômodos Extras e as 30 Plantas Baixas (Floorplans) do Domínio da Casa.
 */

export const EXTRA_ROOM_CATALOG = [
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

export const LAYOUT_PRESETS = Array.from({ length: 30 }, (_, i) => {
  const baseOrder = RIGHT_ORDERS_4[i % RIGHT_ORDERS_4.length];
  const hasFifthEastRoom = i % 2 === 1;
  const eastExtraDef = EXTRA_ROOM_CATALOG[i % 10];
  const rightOrder = [...baseOrder];
  if (hasFifthEastRoom) {
    const insertPos = i % 5;
    rightOrder.splice(insertPos, 0, eastExtraDef.id);
  }

  const westMidExtraDef = EXTRA_ROOM_CATALOG[(i + 3) % 11];
  const westAuxExtraDef = EXTRA_ROOM_CATALOG[(i + 7) % 11];
  const hasYardOutbuilding = i % 3 === 0;

  const corridorX = 412 + (i % 5) * 8;
  const houseRightX = 630 + (i % 4) * 6;
  const garageW = 438 + (i % 5) * 10;
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
