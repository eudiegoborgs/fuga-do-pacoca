import {
  MAP_CONFIG,
  computeVisibilityPolygon,
  isPointVisibleToPacoca,
} from './map.js';

export class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cameraZoom = 1.85;
    this.visionRadius = 260;
    this.exploredCanvas = null;
    this.exploredCtx = null;
    this.resetFog();
  }

  resetFog() {
    if (typeof document !== 'undefined') {
      if (!this.exploredCanvas) {
        this.exploredCanvas = document.createElement('canvas');
        this.exploredCanvas.width = MAP_CONFIG.width;
        this.exploredCanvas.height = MAP_CONFIG.height;
        this.exploredCtx = this.exploredCanvas.getContext('2d');
      }
      this.exploredCtx.globalCompositeOperation = 'source-over';
      this.exploredCtx.fillStyle = '#090d16';
      this.exploredCtx.fillRect(0, 0, MAP_CONFIG.width, MAP_CONFIG.height);
    }
  }

  render(state) {
    const ctx = this.ctx;
    const vw = this.canvas?.width || 640;
    const vh = this.canvas?.height || 640;
    ctx.clearRect(0, 0, vw, vh);

    // Fundo escuro fora dos limites do mapa
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, vw, vh);

    const p = state.pacoca;
    const visPoly = computeVisibilityPolygon(
      p.x,
      p.y,
      this.visionRadius,
      MAP_CONFIG.walls,
      96
    );

    // Transformação de câmera com zoom maior centralizado no Paçoca
    const viewWorldW = vw / this.cameraZoom;
    const viewWorldH = vh / this.cameraZoom;
    const camX = Math.max(
      0,
      Math.min(MAP_CONFIG.width - viewWorldW, p.x - viewWorldW / 2)
    );
    const camY = Math.max(
      0,
      Math.min(MAP_CONFIG.height - viewWorldH, p.y - viewWorldH / 2)
    );

    ctx.save();
    ctx.scale(this.cameraZoom, this.cameraZoom);
    ctx.translate(-camX, -camY);

    this.drawRooms(ctx, state);
    this.drawFurniture(ctx, state);
    this.drawDoorsAndGate(ctx, state.time);
    this.drawPeePuddles(ctx, state);
    this.drawWalls(ctx);
    this.drawFogOfWar(ctx, state, visPoly);
    this.drawWaterHazards(ctx, state);
    this.drawCameras(ctx, state.cameras, p);
    this.drawHumans(ctx, state.humans, state.time, p);
    this.drawDogs(ctx, state, state.time, p);
    this.drawPacoca(ctx, p, state.time);
    this.drawBryanNotesOverlay(ctx, state.humans, state.time);
    this.drawSpeechBubbles(ctx, [...state.humans, ...(state.dogs || [])], p);

    ctx.restore();

    this.drawCanvasStatusHUD(ctx, state, vw);
    this.drawMinimap(ctx, state, vw, vh);
    this.drawExitCompass(ctx, p, vw, vh);
  }

  drawCanvasStatusHUD(ctx, state, vw) {
    if (!state?.pacoca) return;
    const p = state.pacoca;
    const maxCd = p.peeMaxCooldown || 5.0;
    const peeRatio = Math.max(0, Math.min(1, 1 - (p.peeCooldown || 0) / maxCd));

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.84)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(12, 12, vw - 24, 38, 10);
    ctx.fill();
    ctx.stroke();

    // 1. Corações (Pelo Seco)
    const fullHearts = '❤️'.repeat(p.hearts);
    const emptyHearts = '🖤'.repeat(Math.max(0, p.maxHearts - p.hearts));
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Pelo Seco: ${fullHearts}${emptyHearts}`, 24, 31);

    // 2. Barra de Xixi (Centro-Esquerda)
    const barX = 180;
    const barY = 23;
    const barW = 132;
    const barH = 16;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
    ctx.strokeStyle = peeRatio >= 1 ? '#facc15' : '#64748b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 8);
    ctx.fill();
    ctx.stroke();

    if (peeRatio > 0) {
      ctx.fillStyle = peeRatio >= 1 ? '#facc15' : '#38bdf8';
      ctx.beginPath();
      ctx.roundRect(barX + 2, barY + 2, Math.max(6, (barW - 4) * peeRatio), barH - 4, 6);
      ctx.fill();
    }

    ctx.fillStyle = peeRatio >= 1 ? '#0f172a' : '#f8fafc';
    ctx.font = '800 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      peeRatio >= 1 ? '💦 Xixi (E): CHEIA!' : `💦 Xixi: ${p.peeCooldown.toFixed(1)}s`,
      barX + barW / 2,
      barY + barH / 2 + 0.5
    );

    // 3. Cronômetro da Fuga (Centro-Direita)
    ctx.fillStyle = '#fde047';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`⏱️ ${(state.time || 0).toFixed(1)}s`, 326, 31);

    // 4. Status da Casa (Direita)
    const isAlert = state.houseAlertTimer > 0;
    ctx.fillStyle = isAlert ? '#fca5a5' : '#86efac';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(
      isAlert ? `🚨 Alerta: ${state.lastAlertSource}` : '🏠 Casa Calma',
      vw - 24,
      31
    );
    ctx.restore();
  }

  drawFogOfWar(ctx, state, visPoly) {
    if (!visPoly || visPoly.length === 0) return;

    // 1. Atualiza máscara permanente de áreas já exploradas pelo Paçoca
    if (this.exploredCtx) {
      this.exploredCtx.save();
      this.exploredCtx.globalCompositeOperation = 'destination-out';
      this.exploredCtx.fillStyle = '#ffffff';
      this.exploredCtx.beginPath();
      this.exploredCtx.moveTo(visPoly[0].x, visPoly[0].y);
      for (let i = 1; i < visPoly.length; i++) {
        this.exploredCtx.lineTo(visPoly[i].x, visPoly[i].y);
      }
      this.exploredCtx.closePath();
      this.exploredCtx.fill();
      this.exploredCtx.restore();
    }

    // 2. Sombra parcial nas áreas fora do espaço visível atual (memória do que já foi visto)
    ctx.save();
    ctx.fillStyle = 'rgba(9, 13, 22, 0.62)';
    ctx.beginPath();
    ctx.rect(0, 0, MAP_CONFIG.width, MAP_CONFIG.height);
    ctx.moveTo(visPoly[0].x, visPoly[0].y);
    for (let i = 1; i < visPoly.length; i++) {
      ctx.lineTo(visPoly[i].x, visPoly[i].y);
    }
    ctx.closePath();
    ctx.fill('evenodd');

    // Contorno suave de luz no espaço visível atual do Paçoca
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(visPoly[0].x, visPoly[0].y);
    for (let i = 1; i < visPoly.length; i++) {
      ctx.lineTo(visPoly[i].x, visPoly[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // 3. Névoa total nas áreas ainda nunca exploradas pelo Paçoca
    if (this.exploredCanvas) {
      ctx.drawImage(this.exploredCanvas, 0, 0);
    }
    ctx.restore();
  }

  drawMinimap(ctx, state, vw, vh) {
    const map = state?.map || MAP_CONFIG;
    const miniW = 112;
    const miniH = Math.round((miniW * map.height) / map.width);
    const mx = vw - miniW - 12;
    const my = vh - miniH - 12;
    const scale = miniW / map.width;

    ctx.save();
    // Moldura da Planta Baixa
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(mx - 4, my - 18, miniW + 8, miniH + 22, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = '800 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const planTag = map.layoutId ? `🗺️ PLANTA #${map.layoutId.replace('planta_', '')}` : '🗺️ PLANTA BAIXA';
    ctx.fillText(planTag, mx + miniW / 2, my - 9);

    ctx.translate(mx, my);
    ctx.scale(scale, scale);

    const palettes = {
      yard: '#bbf7d0',
      yard_closed: '#a7f3d0',
      indoor: '#f8fafc',
      bedroom: '#fef08a',
      bathroom: '#bae6fd',
      office: '#ddd6fe',
      library: '#fde68a',
      laundry: '#cffafe',
      dining: '#fed7aa',
      veranda: '#99f6e4',
      winter_garden: '#86efac',
      pantry: '#e2e8f0',
      closet: '#f5d0fe',
      playroom: '#fbcfe8',
      tv_room: '#c7d2fe',
      outbuilding: '#fca5a5',
      garage: '#cbd5e1',
      blocked: '#64748b',
    };

    for (const room of map.rooms) {
      ctx.fillStyle = palettes[room.type] || '#e2e8f0';
      ctx.fillRect(room.x, room.y, room.w, room.h);
    }

    if (map.yardFeatures?.flowerbed) {
      const fb = map.yardFeatures.flowerbed;
      ctx.fillStyle = '#15803d';
      ctx.fillRect(fb.x, fb.y, fb.w, fb.h);
    }

    // Paredes na planta baixa
    ctx.fillStyle = '#1e293b';
    for (const wall of map.walls) {
      if (wall.isYardObstacle) continue;
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    }

    // Portas e passagens
    ctx.fillStyle = '#38bdf8';
    for (const door of map.doors) {
      ctx.fillRect(door.x, door.y, door.w, door.h);
    }

    // Portão de saída destacado (sem mostrar localização de personagens)
    const gate = map.exitGate;
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(gate.x, gate.y, gate.w, gate.h);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 10;
    ctx.strokeRect(gate.x, gate.y, gate.w, gate.h);

    // Rótulos curtos dos cômodos
    ctx.fillStyle = '#0f172a';
    ctx.font = '800 40px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const shortLabels = {
      cozinha: 'Coz',
      sala: 'Sala',
      quarto_1: 'Q1',
      quarto_2: 'Q2',
      quarto_3: 'Q3',
      banheiro: 'Ban',
      garagem: 'Gar',
    };
    for (const room of map.rooms) {
      const lbl = room.short || shortLabels[room.id];
      if (lbl) {
        ctx.fillText(lbl, room.x + room.w / 2, room.y + room.h / 2);
      }
    }

    ctx.restore();
  }

  drawExitCompass(ctx, pacoca, vw, vh) {
    const gateX = MAP_CONFIG.exitGate.x + MAP_CONFIG.exitGate.w / 2;
    const gateY = MAP_CONFIG.exitGate.y + MAP_CONFIG.exitGate.h / 2;
    const angle = Math.atan2(gateY - pacoca.y, gateX - pacoca.x);
    const distMeters = Math.max(0, Math.round(Math.hypot(gateX - pacoca.x, gateY - pacoca.y) / 35));

    ctx.save();
    const cx = vw - 170;
    const cy = vh - 48;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy - 4);
    ctx.rotate(angle);
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-10, -8);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-10, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Portão ${distMeters}m`, cx, cy + 20);
    ctx.restore();
  }

  drawRooms(ctx, state) {
    const map = state?.map || MAP_CONFIG;
    const palettes = {
      yard: '#dcfce7',
      yard_closed: '#d1fae5',
      indoor: '#f8fafc',
      bedroom: '#fef9c3',
      bathroom: '#e0f2fe',
      office: '#ede9fe',
      library: '#fef3c7',
      laundry: '#ecfeff',
      dining: '#ffedd5',
      veranda: '#ccfbf1',
      winter_garden: '#bbf7d0',
      pantry: '#f1f5f9',
      closet: '#fae8ff',
      playroom: '#fce7f3',
      tv_room: '#e0e7ff',
      outbuilding: '#fee2e2',
      garage: '#e2e8f0',
      blocked: '#94a3b8',
    };

    for (const room of map.rooms) {
      ctx.fillStyle = palettes[room.type] || '#f1f5f9';
      ctx.fillRect(room.x, room.y, room.w, room.h);

      if (room.type !== 'blocked') {
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.05)';
        ctx.lineWidth = 1;
        const step = 32;
        for (let gx = room.x; gx < room.x + room.w; gx += step) {
          ctx.beginPath();
          ctx.moveTo(gx, room.y);
          ctx.lineTo(gx, room.y + room.h);
          ctx.stroke();
        }
        for (let gy = room.y; gy < room.y + room.h; gy += step) {
          ctx.beginPath();
          ctx.moveTo(room.x, gy);
          ctx.lineTo(room.x + room.w, gy);
          ctx.stroke();
        }
      } else {
        ctx.save();
        ctx.beginPath();
        ctx.rect(room.x, room.y, room.w, room.h);
        ctx.clip();
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
        ctx.lineWidth = 2;
        for (let i = -300; i < 600; i += 22) {
          ctx.beginPath();
          ctx.moveTo(room.x + i, room.y);
          ctx.lineTo(room.x + i + 260, room.y + room.h);
          ctx.stroke();
        }
        ctx.restore();
      }

      if (room.label) {
        ctx.fillStyle = room.type === 'blocked' ? '#334155' : 'rgba(30, 41, 59, 0.42)';
        ctx.font = '800 14px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(room.label, room.x + room.w / 2, room.y + room.h / 2);
      }
    }
  }

  drawFurniture(ctx, state) {
    ctx.save();
    const map = state?.map || MAP_CONFIG;
    const findRoom = (id) => map.rooms.find((r) => r.id === id);
    const cozinha = findRoom('cozinha') || { x: 190, y: 190, w: 250, h: 240 };
    const sala = findRoom('sala') || { x: 190, y: 446, w: 250, h: 260 };
    const q1 = findRoom('quarto_1') || { x: 482, y: 190, w: 152, h: 132 };
    const banheiro = findRoom('banheiro') || { x: 500, y: 361, w: 134, h: 84 };
    const q2 = findRoom('quarto_2') || { x: 482, y: 447, w: 152, h: 126 };
    const q3 = findRoom('quarto_3') || { x: 482, y: 585, w: 152, h: 126 };
    const portaGaragem = map.doors.find((d) => d.id === 'porta_sala_garagem') || { x: 382, y: 706, w: 54, h: 30 };

    // =========================================================
    // 1. COZINHA (posiciona móveis dinamicamente conforme o layout)
    // =========================================================
    ctx.fillStyle = '#cbd5e1';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.fillRect(cozinha.x + 4, cozinha.y + 4, 48, 48);
    ctx.strokeRect(cozinha.x + 4, cozinha.y + 4, 48, 48);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(cozinha.x + 46, cozinha.y + 12, 4, 14);
    ctx.fillRect(cozinha.x + 46, cozinha.y + 32, 4, 14);

    // Bancada de granito escuro na esquerda (com pia e fogão 4 bocas)
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#0f172a';
    ctx.fillRect(cozinha.x + 4, cozinha.y + 56, 44, 178);
    ctx.strokeRect(cozinha.x + 4, cozinha.y + 56, 44, 178);

    // Cuba da pia de inox + torneira
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(cozinha.x + 10, cozinha.y + 70, 30, 42);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(cozinha.x + 14, cozinha.y + 74, 22, 34);
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(cozinha.x + 14, cozinha.y + 91, 4, 0, Math.PI * 2);
    ctx.fill();

    // Fogão 4 bocas embutido
    ctx.fillStyle = '#334155';
    ctx.fillRect(cozinha.x + 8, cozinha.y + 135, 36, 46);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    for (const [bx, by] of [
      [cozinha.x + 18, cozinha.y + 147],
      [cozinha.x + 34, cozinha.y + 147],
      [cozinha.x + 18, cozinha.y + 167],
      [cozinha.x + 34, cozinha.y + 167],
    ]) {
      ctx.beginPath();
      ctx.arc(bx, by, 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Balcão de granito com o pote de tampa vermelha
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cozinha.x + 152, cozinha.y + 14, 86, 32);
    ctx.strokeRect(cozinha.x + 152, cozinha.y + 14, 86, 32);
    ctx.fillStyle = '#fecdd3';
    ctx.fillRect(cozinha.x + 166, cozinha.y + 20, 16, 16);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(cozinha.x + 164, cozinha.y + 18, 20, 5);

    // Lixeira preta e vasinho de planta
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.arc(cozinha.x + 158, cozinha.y + 60, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#292524';
    ctx.beginPath();
    ctx.arc(cozinha.x + 64, cozinha.y + 22, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.arc(cozinha.x + 64, cozinha.y + 22, 6, 0, Math.PI * 2);
    ctx.fill();

    // =========================================================
    // 2. SALA (posiciona móveis dinamicamente conforme o layout)
    // =========================================================
    ctx.fillStyle = 'rgba(217, 119, 6, 0.14)';
    ctx.strokeStyle = 'rgba(180, 83, 9, 0.3)';
    ctx.lineWidth = 2;
    ctx.fillRect(sala.x + 65, sala.y + 48, 115, 145);
    ctx.strokeRect(sala.x + 65, sala.y + 48, 115, 145);

    // Sofá estofado bege claro
    ctx.fillStyle = '#e7e5e4';
    ctx.strokeStyle = '#a8a29e';
    ctx.lineWidth = 2;
    ctx.fillRect(sala.x + 6, sala.y + 45, 50, 150);
    ctx.strokeRect(sala.x + 6, sala.y + 45, 50, 150);
    ctx.fillStyle = '#d6d3d1';
    ctx.fillRect(sala.x + 6, sala.y + 45, 14, 150);
    ctx.strokeRect(sala.x + 20, sala.y + 52, 32, 44);
    ctx.strokeRect(sala.x + 20, sala.y + 98, 32, 44);
    ctx.strokeRect(sala.x + 20, sala.y + 144, 32, 44);

    // Mesinha de centro de madeira
    ctx.fillStyle = '#b45309';
    ctx.fillRect(sala.x + 95, sala.y + 95, 42, 60);
    ctx.strokeStyle = '#78350f';
    ctx.strokeRect(sala.x + 95, sala.y + 95, 42, 60);

    // Rack e TV
    ctx.fillStyle = '#78350f';
    ctx.fillRect(sala.x + 25, sala.y + sala.h - 26, 110, 18);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(sala.x + 45, sala.y + sala.h - 20, 70, 6);

    // =========================================================
    // 3. QUARTO 1 (Quarto Inicial do Paçoca — posição dinâmica)
    // =========================================================
    this.drawBed(ctx, q1.x + q1.w - 76, q1.y + 8, 72, 86, '#3b82f6', '#93c5fd');
    ctx.fillStyle = '#92400e';
    ctx.strokeStyle = '#451a03';
    ctx.fillRect(q1.x + 30, q1.y + q1.h - 26, 62, 22);
    ctx.strokeRect(q1.x + 30, q1.y + q1.h - 26, 62, 22);
    // Caminha redonda do Paçoca no ponto cego
    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(map.spawn.x, map.spawn.y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.arc(map.spawn.x, map.spawn.y, 11, 0, Math.PI * 2);
    ctx.fill();

    // =========================================================
    // 4. BANHEIRO (posição dinâmica)
    // =========================================================
    ctx.fillStyle = '#bae6fd';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.5;
    ctx.fillRect(banheiro.x + banheiro.w - 40, banheiro.y + 4, 36, banheiro.h - 8);
    ctx.strokeRect(banheiro.x + banheiro.w - 40, banheiro.y + 4, 36, banheiro.h - 8);
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(banheiro.x + banheiro.w - 22, banheiro.y + banheiro.h / 2, 4, 0, Math.PI * 2);
    ctx.fill();
    // Vaso sanitário branco
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#64748b';
    ctx.fillRect(banheiro.x + 52, banheiro.y + 4, 20, 10);
    ctx.strokeRect(banheiro.x + 52, banheiro.y + 4, 20, 10);
    ctx.beginPath();
    ctx.ellipse(banheiro.x + 62, banheiro.y + 24, 9, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Pia com bancada
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(banheiro.x + 38, banheiro.y + banheiro.h - 18, 38, 15);
    ctx.strokeRect(banheiro.x + 38, banheiro.y + banheiro.h - 18, 38, 15);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(banheiro.x + 57, banheiro.y + banheiro.h - 10, 6, 0, Math.PI * 2);
    ctx.fill();

    // =========================================================
    // 5. QUARTO 2 (posição dinâmica)
    // =========================================================
    this.drawBed(ctx, q2.x + q2.w - 72, q2.y + 8, 68, 76, '#ec4899', '#fbcfe8');
    ctx.fillStyle = '#b45309';
    ctx.strokeStyle = '#78350f';
    ctx.fillRect(q2.x + 23, q2.y + q2.h - 26, 52, 22);
    ctx.strokeRect(q2.x + 23, q2.y + q2.h - 26, 52, 22);
    ctx.fillStyle = '#334155';
    ctx.fillRect(q2.x + 38, q2.y + q2.h - 22, 20, 12);

    // =========================================================
    // 6. QUARTO 3 (posição dinâmica)
    // =========================================================
    this.drawBed(ctx, q3.x + q3.w - 72, q3.y + 8, 68, 76, '#10b981', '#a7f3d0');
    ctx.fillStyle = '#78350f';
    ctx.fillRect(q3.x + 23, q3.y + q3.h - 26, 58, 22);
    ctx.strokeStyle = '#451a03';
    ctx.strokeRect(q3.x + 23, q3.y + q3.h - 26, 58, 22);

    // =========================================================
    // 7. QUINTAL (Layout dinâmico do Quintal: Casinha, Canteiro, Piscina/Fonte e Vasos)
    // =========================================================
    const yf = map.yardFeatures || {
      doghouse: { x: 460, y: 24, w: 48, h: 40 },
      flowerbed: { x: 22, y: 410, w: 28, h: 90 },
      pool: { x: 720, y: 210, r: 34 },
      plants: [
        [36, 160],
        [36, 560],
        [200, 36],
        [695, 80],
        [695, 480],
      ],
    };

    // Casinha do Paçoca + potes de água/ração
    const dh = yf.doghouse;
    ctx.fillStyle = '#b91c1c';
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 2;
    ctx.fillRect(dh.x, dh.y, dh.w, dh.h);
    ctx.strokeRect(dh.x, dh.y, dh.w, dh.h);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(dh.x + 4, dh.y + 4, dh.w - 8, 16);
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(dh.x + dh.w + 12, dh.y + 16, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(dh.x + dh.w + 28, dh.y + 16, 7, 0, Math.PI * 2);
    ctx.fill();

    // Canteiro de Jardim / Arbustos (Obstáculo físico no Quintal)
    const fb = yf.flowerbed;
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    ctx.fillRect(fb.x, fb.y, fb.w, fb.h);
    ctx.strokeRect(fb.x, fb.y, fb.w, fb.h);
    ctx.fillStyle = '#15803d';
    ctx.fillRect(fb.x + 4, fb.y + 4, fb.w - 8, fb.h - 8);
    // Flores coloridas no canteiro
    for (let i = 0; i < 3; i++) {
      const fx = fb.w > fb.h ? fb.x + 18 + i * 26 : fb.x + fb.w / 2;
      const fy = fb.h > fb.w ? fb.y + 18 + i * 26 : fb.y + fb.h / 2;
      ctx.fillStyle = i % 2 === 0 ? '#f43f5e' : '#facc15';
      ctx.beginPath();
      ctx.arc(fx, fy, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Piscina inflável / Fonte decorativa no Quintal
    const pl = yf.pool;
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(pl.x, pl.y, pl.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(pl.x, pl.y, pl.r - 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pl.x - 4, pl.y - 3, pl.r * 0.45, 0, Math.PI * 1.4);
    ctx.stroke();

    // Vasos de plantas em posições dinâmicas
    for (const [px, py] of yf.plants) {
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(px, py, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(px - 3, py - 2, 8, 0, Math.PI * 2);
      ctx.arc(px + 4, py + 2, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // =========================================================
    // 8. GARAGEM (Base: x: 16..470, y: 736..1034)
    // =========================================================
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.35)';
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 3;
    ctx.strokeRect(185, 775, 195, 200);
    ctx.setLineDash([]);

    // Tapete de boas-vindas alinhado à porta da Garagem
    ctx.fillStyle = '#92400e';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.5;
    ctx.fillRect(portaGaragem.x + 2, portaGaragem.y + portaGaragem.h + 4, 50, 22);
    ctx.strokeRect(portaGaragem.x + 2, portaGaragem.y + portaGaragem.h + 4, 50, 22);

    // Balde azul com espuma da Stéfanny no canto da Garagem
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(46, 800, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.arc(46, 800, 9, 0, Math.PI * 2);
    ctx.fill();

    // =========================================================
    // 9. CÔMODOS EXTRAS DA PLANTA BAIXA (Escritório, Lavanderia, etc.)
    // =========================================================
    for (const r of map.rooms) {
      if (r.type === 'office' || r.type === 'library') {
        ctx.fillStyle = '#78350f';
        ctx.fillRect(r.x + r.w - 42, r.y + 10, 34, Math.min(54, r.h - 20));
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(r.x + r.w - 34, r.y + 20, 16, 22);
      } else if (r.type === 'laundry') {
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.fillRect(r.x + r.w - 40, r.y + 10, 32, 32);
        ctx.strokeRect(r.x + r.w - 40, r.y + 10, 32, 32);
        ctx.beginPath();
        ctx.arc(r.x + r.w - 24, r.y + 26, 9, 0, Math.PI * 2);
        ctx.stroke();
      } else if (r.type === 'dining') {
        ctx.fillStyle = '#92400e';
        ctx.fillRect(r.x + 18, r.y + 14, Math.min(58, r.w - 36), Math.min(36, r.h - 28));
      } else if (r.type === 'playroom' || r.type === 'tv_room') {
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(r.x + r.w - 28, r.y + 26, 12, 0, Math.PI * 2);
        ctx.fill();
      } else if (r.type === 'winter_garden' || r.type === 'veranda') {
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(r.x + r.w - 24, r.y + 22, 10, 0, Math.PI * 2);
        ctx.fill();
      } else if (r.type === 'outbuilding') {
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(r.x + 12, r.y + 8, Math.min(48, r.w - 24), 18);
      }
    }

    ctx.restore();
  }

  drawBed(ctx, x, y, w, h, blanketColor, sheetColor) {
    ctx.save();
    // Moldura de madeira
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    // Lençol
    ctx.fillStyle = sheetColor;
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
    // Edredom/colcha
    ctx.fillStyle = blanketColor;
    ctx.fillRect(x + 4, y + 26, w - 8, h - 30);
    // Travesseiros brancos
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.fillRect(x + 8, y + 7, 24, 14);
    ctx.strokeRect(x + 8, y + 7, 24, 14);
    ctx.fillRect(x + w - 32, y + 7, 24, 14);
    ctx.strokeRect(x + w - 32, y + 7, 24, 14);
    ctx.restore();
  }

  drawDoorsAndGate(ctx, time) {
    for (const door of MAP_CONFIG.doors) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.28)';
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.fillRect(door.x, door.y, door.w, door.h);
      ctx.strokeRect(door.x, door.y, door.w, door.h);

      ctx.fillStyle = '#1d4ed8';
      ctx.font = '700 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(door.label, door.x + door.w / 2, door.y + door.h / 2);
    }

    const gate = MAP_CONFIG.exitGate;
    const pulse = 0.75 + Math.sin(time * 5) * 0.25;
    ctx.fillStyle = `rgba(37, 99, 235, ${0.78 * pulse})`;
    ctx.fillRect(gate.x, gate.y, gate.w, gate.h);
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 3;
    ctx.strokeRect(gate.x, gate.y, gate.w, gate.h);

    ctx.fillStyle = '#ffffff';
    ctx.font = gate.w < 120 ? '800 11px system-ui, sans-serif' : '800 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      gate.w < 120 ? '🐾 PORTÃO 🐾' : '🐾 PORTÃO (SAÍDA PARA A RUA) 🐾',
      gate.x + gate.w / 2,
      gate.y + gate.h / 2
    );
  }

  drawWalls(ctx) {
    ctx.fillStyle = '#334155';
    for (const wall of MAP_CONFIG.walls) {
      if (wall.isYardObstacle) continue;
      if (wall.isBlockedZone || (wall.x === 470 && wall.y === 736)) {
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 3;
        ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
        continue;
      }
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    }
  }

  drawPeePuddles(ctx, state) {
    if (!state.peePuddles) return;
    for (const pee of state.peePuddles) {
      ctx.save();
      ctx.fillStyle = 'rgba(250, 204, 21, 0.82)';
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(pee.x, pee.y, pee.radius + 2, pee.radius - 2, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Brilho na poça de xixi
      ctx.fillStyle = 'rgba(254, 249, 195, 0.75)';
      ctx.beginPath();
      ctx.arc(pee.x - 4, pee.y - 3, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '700 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(pee.cleanerId ? '🧻' : '💦', pee.x, pee.y - pee.radius - 4);
      ctx.restore();
    }
  }

  drawWaterHazards(ctx, state) {
    for (const puddle of state.puddles) {
      const alpha = Math.min(0.65, puddle.ttl / 3);
      ctx.fillStyle = `rgba(56, 189, 248, ${alpha})`;
      ctx.beginPath();
      ctx.arc(puddle.x, puddle.y, puddle.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(2, 132, 199, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      // Bolhas de sabão na poça
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(puddle.x - 6, puddle.y - 5, 4, 0, Math.PI * 2);
      ctx.arc(puddle.x + 7, puddle.y + 4, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    const stefanny = state.humans.find((h) => h.id === 'stefanny');
    if (stefanny && stefanny.waterActive) {
      ctx.save();
      ctx.fillStyle = 'rgba(14, 165, 233, 0.38)';
      ctx.beginPath();
      ctx.moveTo(stefanny.x, stefanny.y);
      ctx.arc(
        stefanny.x,
        stefanny.y,
        stefanny.waterRange,
        stefanny.angle - 0.22,
        stefanny.angle + 0.22
      );
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  drawCameras(ctx, cameras, pacoca) {
    for (const cam of cameras) {
      if (
        pacoca &&
        !isPointVisibleToPacoca(
          cam.x,
          cam.y,
          pacoca.x,
          pacoca.y,
          this.visionRadius + cam.range * 0.6,
          MAP_CONFIG.walls
        )
      ) {
        continue;
      }
      ctx.save();
      ctx.fillStyle = cam.alerted
        ? 'rgba(239, 68, 68, 0.34)'
        : 'rgba(234, 179, 8, 0.20)';
      ctx.strokeStyle = cam.alerted
        ? 'rgba(220, 38, 38, 0.7)'
        : 'rgba(202, 138, 4, 0.45)';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(cam.x, cam.y);
      ctx.arc(
        cam.x,
        cam.y,
        cam.range,
        cam.angle - cam.fov / 2,
        cam.angle + cam.fov / 2
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Corpo 2D da câmera de segurança
      ctx.translate(cam.x, cam.y);
      ctx.rotate(cam.angle);
      ctx.fillStyle = cam.alerted ? '#dc2626' : '#1e293b';
      ctx.fillRect(-8, -6, 16, 12);
      ctx.fillStyle = cam.alerted ? '#fca5a5' : '#38bdf8';
      ctx.fillRect(6, -4, 4, 8);
      ctx.restore();
    }
  }

  drawHumans(ctx, humans, time, pacoca) {
    for (const h of humans) {
      if (
        pacoca &&
        !isPointVisibleToPacoca(
          h.x,
          h.y,
          pacoca.x,
          pacoca.y,
          this.visionRadius + 25,
          MAP_CONFIG.walls
        )
      ) {
        continue;
      }
      if (h.id === 'diego' && h.inCall) {
        ctx.save();
        ctx.globalAlpha = 0.45;
        this.drawHumanSprite(ctx, h, time);
        ctx.fillStyle = '#1e3a8a';
        ctx.font = '800 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`📞 Em Call (${Math.ceil(h.callTimer)}s)`, h.x, h.y + h.radius + 22);
        ctx.restore();
        continue;
      }

      // Cone de visão (oculto quando distraído limpando xixi ou TDAH da Stéfanny)
      if (
        !(h.id === 'stefanny' && h.mode === 'distracted') &&
        h.mode !== 'cleaning_pee'
      ) {
        ctx.save();
        const isChasing = h.mode === 'chase' || h.mode === 'screaming';
        ctx.fillStyle = isChasing
          ? 'rgba(239, 68, 68, 0.24)'
          : 'rgba(59, 130, 246, 0.13)';
        ctx.beginPath();
        ctx.moveTo(h.x, h.y);
        ctx.arc(
          h.x,
          h.y,
          h.visionRange,
          h.angle - h.fov / 2,
          h.angle + h.fov / 2
        );
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Onda sonora quando a Emily grita
      if (h.id === 'emily' && h.mode === 'screaming') {
        ctx.save();
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.8)';
        ctx.lineWidth = 3;
        const waveR = 25 + ((time * 90) % 65);
        ctx.beginPath();
        ctx.arc(h.x, h.y, waveR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      this.drawHumanSprite(ctx, h, time);

      // Etiqueta com nome abaixo do personagem 2D
      ctx.save();
      ctx.fillStyle = '#0f172a';
      ctx.font = '800 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(h.name, h.x, h.y + h.radius + 17);
      ctx.restore();
    }
  }

  drawHumanSprite(ctx, h, time) {
    ctx.save();
    ctx.translate(h.x, h.y);
    const swing = Math.sin(time * 9) * 3;

    // Sombra no chão
    ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
    ctx.beginPath();
    ctx.ellipse(0, h.radius + 2, h.radius * 0.9, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // =========================================================
    // 1. EMILY (Irmã): Cabelo castanho-escuro longo, cílios marcantes, tutu de balé e patins!
    // =========================================================
    if (h.id === 'emily') {
      if (h.mode === 'pirouette') {
        ctx.rotate(h.angle);
      }
      // Cabelo longo castanho-escuro atrás
      ctx.fillStyle = '#271c19';
      ctx.beginPath();
      ctx.ellipse(0, 2, 13, 15, 0, 0, Math.PI * 2);
      ctx.fill();

      // Patins brancos com rodinhas rosa nos pés
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-9, 10 + swing * 0.4, 7, 6);
      ctx.fillRect(2, 10 - swing * 0.4, 7, 6);
      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.arc(-7, 17 + swing * 0.4, 2, 0, Math.PI * 2);
      ctx.arc(-3, 17 + swing * 0.4, 2, 0, Math.PI * 2);
      ctx.arc(4, 17 - swing * 0.4, 2, 0, Math.PI * 2);
      ctx.arc(8, 17 - swing * 0.4, 2, 0, Math.PI * 2);
      ctx.fill();

      // Saia/Tutu de balé rosa + blusa preta
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.ellipse(0, 8, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-8, -1, 16, 10);

      // Braços (erguidos em arco de balé durante a pirueta!)
      ctx.strokeStyle = '#eab696';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      if (h.mode === 'pirouette') {
        ctx.arc(0, -8, 13, Math.PI * 1.15, Math.PI * 1.85);
      } else {
        ctx.moveTo(-8, 1);
        ctx.lineTo(-14, 6 + swing);
        ctx.moveTo(8, 1);
        ctx.lineTo(14, 6 - swing);
      }
      ctx.stroke();

      // Rosto, olhos castanhos grandes e cabelo partido ao meio
      ctx.fillStyle = '#eab696';
      ctx.beginPath();
      ctx.arc(0, -6, 9.5, 0, Math.PI * 2);
      ctx.fill();
      // Cabelo no topo partido ao meio
      ctx.fillStyle = '#271c19';
      ctx.beginPath();
      ctx.arc(0, -8, 10, Math.PI, Math.PI * 2);
      ctx.fill();
      // Olhos castanhos expressivos
      ctx.fillStyle = '#291711';
      ctx.beginPath();
      ctx.arc(-3.5, -5.5, 1.8, 0, Math.PI * 2);
      ctx.arc(3.5, -5.5, 1.8, 0, Math.PI * 2);
      ctx.fill();
      // Boca (aberta quando está gritando!)
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      if (h.mode === 'screaming') {
        ctx.arc(0, -1.5, 3, 0, Math.PI * 2);
      } else {
        ctx.arc(0, -2, 2, 0, Math.PI);
      }
      ctx.fill();
    }

    // =========================================================
    // 2. DIEGO (Pai): Grande/forte, moletom preto, barba cheia, olhos abertos e alargadores!
    // =========================================================
    else if (h.id === 'diego') {
      // Pernas (calça escura)
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-9, 11 + swing * 0.4, 7, 8);
      ctx.fillRect(2, 11 - swing * 0.4, 7, 8);

      // Tronco largo e forte — Moletom preto com capuz e cordões brancos (fiel à foto!)
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.roundRect(-15, -3, 30, 17, 6);
      ctx.fill();
      // Cordões do moletom
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-3, 0);
      ctx.lineTo(-3, 7);
      ctx.moveTo(3, 0);
      ctx.lineTo(3, 7);
      ctx.stroke();

      // Cabeça + Orelhas com Alargadores menores (plugs pretos com aro claro)
      ctx.fillStyle = '#d69e72';
      ctx.beginPath();
      ctx.arc(0, -8, 11, 0, Math.PI * 2);
      ctx.fill();
      // Alargadores menores nas duas orelhas
      for (const ex of [-11.2, 11.2]) {
        ctx.fillStyle = '#111827';
        ctx.beginPath();
        ctx.arc(ex, -7, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Barba cheia escura e bigode + contorno cinza na borda para facilitar o contraste
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.arc(0, -6.5, 10.5, 0.15, Math.PI - 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, -6.5, 10.5, 0.15, Math.PI - 0.15);
      ctx.stroke();
      // Boca na barba
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(-2.5, -4.5, 5, 2);

      // Cabelo cacheado escuro no topo
      ctx.fillStyle = '#18181b';
      for (const [cx, cy, cr] of [
        [-6, -16, 4.5],
        [-2, -17.5, 5],
        [3, -17, 5],
        [7, -15.5, 4.2],
      ]) {
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Dois olhos abertos (círculo preto, sem óculos)
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(-4, -9.2, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(4, -9.2, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // =========================================================
    // 3. STÉFANNY (Mãe - Chefe): Cabelão escuro jogado de lado, blusa marinho, colar e mangueira!
    // =========================================================
    else if (h.id === 'stefanny') {
      // Volume do cabelão longo escuro jogado para o lado direito (fiel à foto!)
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.ellipse(4, -2, 13, 16, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Pernas
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(-7, 10 + swing * 0.4, 5, 7);
      ctx.fillRect(2, 10 - swing * 0.4, 5, 7);

      // Blusa azul-marinho escura + colar prateado fino
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.roundRect(-10, -1, 20, 13, 5);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0.2, Math.PI - 0.2);
      ctx.stroke();

      // Rosto e sorriso marcante
      ctx.fillStyle = '#df9b6d';
      ctx.beginPath();
      ctx.arc(0, -7, 9.5, 0, Math.PI * 2);
      ctx.fill();
      // Cabelo no topo (acima dos olhos para deixá-los bem visíveis)
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.arc(0, -9.5, 9.8, Math.PI * 1.05, Math.PI * 1.95);
      ctx.fill();
      // Olhos bem visíveis no rosto
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.arc(-3.5, -6.8, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(3.5, -6.8, 1.8, 0, Math.PI * 2);
      ctx.fill();
      // Sorriso branco (ou ponto de interrogação quando distraída)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, -3.5, 3.2, 0, Math.PI);
      ctx.fill();

      // Mangueira verde na mão apontada na direção de visão
      ctx.save();
      ctx.rotate(h.angle);
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(4, 5);
      ctx.lineTo(16, 5);
      ctx.stroke();
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(15, 3, 4, 4);
      ctx.restore();
    }

    // =========================================================
    // 4. BRYAN (Irmão): Franja caída de lado, camiseta preta de astronauta e bermuda bege!
    // =========================================================
    else if (h.id === 'bryan') {
      // Bermuda bege/caqui (fiel à foto!)
      ctx.fillStyle = '#d6c7b2';
      ctx.fillRect(-8, 8, 7, 7 + swing * 0.3);
      ctx.fillRect(1, 8, 7, 7 - swing * 0.3);

      // Camiseta preta com detalhe branco de astronauta/planeta
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.roundRect(-10, -2, 20, 12, 4);
      ctx.fill();
      // Mini astronauta branco na lateral da camiseta + logo no peito
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(-4, 5, 3, 0, Math.PI * 2);
      ctx.arc(4, 1, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Rosto e cabelo liso escuro com franja caída para o lado (acima dos olhos)
      ctx.fillStyle = '#f1c29b';
      ctx.beginPath();
      ctx.arc(0, -7, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1f2937';
      ctx.beginPath();
      ctx.arc(0, -9.5, 9.5, Math.PI * 1.05, Math.PI * 1.95);
      ctx.fill();
      // Franja lateral característica acima da linha dos olhos
      ctx.beginPath();
      ctx.moveTo(-9, -10.5);
      ctx.quadraticCurveTo(0, -7.8, 8.5, -9.5);
      ctx.lineTo(8, -14);
      ctx.lineTo(-8, -14);
      ctx.closePath();
      ctx.fill();

      // Olhos bem visíveis
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(-3.2, -5.8, 1.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(3.2, -5.8, 1.7, 0, Math.PI * 2);
      ctx.fill();
    }

    // =========================================================
    // 5. ARTHUR (Irmão): Skate com rodinhas laranjas, camiseta bege de anime, cabelo cacheado e óculos claros!
    // =========================================================
    else if (h.id === 'arthur') {
      // Skate embaixo dos pés (gira quando ele faz manobra!)
      ctx.save();
      ctx.rotate(h.mode === 'trick' ? time * 10 : h.angle);
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-18, 9, 36, 10, 5);
      ctx.fill();
      ctx.stroke();
      // Rodinhas laranjas do skate
      ctx.fillStyle = '#f97316';
      ctx.fillRect(-13, 7, 5, 3);
      ctx.fillRect(8, 7, 5, 3);
      ctx.fillRect(-13, 18, 5, 3);
      ctx.fillRect(8, 18, 5, 3);
      ctx.restore();

      // Camiseta bege/areia com estampa de anime no peito + correntinha dourada (fiel à foto!)
      ctx.fillStyle = '#dfc39d';
      ctx.beginPath();
      ctx.roundRect(-10, -2, 20, 13, 4);
      ctx.fill();
      // Estampa de anime colorida no peito
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(-5, 1, 10, 7);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-3, 2, 6, 3);
      // Correntinha dourada em V
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-3, -2);
      ctx.lineTo(0, 2);
      ctx.lineTo(3, -2);
      ctx.stroke();

      // Rosto
      ctx.fillStyle = '#e5a97c';
      ctx.beginPath();
      ctx.arc(0, -7, 9, 0, Math.PI * 2);
      ctx.fill();

      // Cabelo cacheado escuro no topo
      ctx.fillStyle = '#27272a';
      for (const [cx, cy, cr] of [
        [-6, -13, 4],
        [-2, -15, 4.5],
        [3, -15, 4.5],
        [7, -13, 4],
        [-8, -10, 3.2],
        [8, -10, 3.2],
      ]) {
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Olhos bem visíveis (sem óculos)
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.arc(-3.5, -6.8, 1.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(3.5, -6.8, 1.7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Indicador de alerta vermelho ao redor se estiver perseguindo
    if (h.mode === 'chase' || h.mode === 'screaming') {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, h.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawBryanNotesOverlay(ctx, humans, time) {
    const bryan = humans.find((h) => h.id === 'bryan');
    if (!bryan || !bryan.isHumming) return;

    ctx.save();
    ctx.fillStyle = '#059669';
    ctx.font = '800 16px system-ui, sans-serif';
    const notes = ['♪', '♫', '♬'];
    for (let i = 0; i < 3; i++) {
      const angle = time * 2.2 + (i * Math.PI * 2) / 3;
      const nx = bryan.x + Math.cos(angle) * 26;
      const ny = bryan.y + Math.sin(angle) * 20 - 12;
      ctx.fillText(notes[i], nx, ny);
    }
    ctx.restore();
  }

  drawDogs(ctx, state, time, pacoca) {
    const spike = state.spike;
    if (
      spike &&
      (!pacoca ||
        isPointVisibleToPacoca(
          spike.x,
          spike.y,
          pacoca.x,
          pacoca.y,
          this.visionRadius + 40,
          MAP_CONFIG.walls
        ))
    ) {
      // Raio circular (Área de Domínio) do Spike
      const domainR = spike.domainRadius || 95;
      ctx.save();
      ctx.fillStyle =
        spike.mode === 'fighting'
          ? 'rgba(239, 68, 68, 0.26)'
          : 'rgba(217, 119, 6, 0.14)';
      ctx.strokeStyle =
        spike.mode === 'fighting' ? '#ef4444' : 'rgba(217, 119, 6, 0.65)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(spike.x, spike.y, domainR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      this.drawSpikeSprite(ctx, spike, time);
    }

    const meggie = state.meggie;
    if (
      meggie &&
      (!pacoca ||
        isPointVisibleToPacoca(
          meggie.x,
          meggie.y,
          pacoca.x,
          pacoca.y,
          this.visionRadius + 25,
          MAP_CONFIG.walls
        ))
    ) {
      // Cone de visão amarelo suave da Meggie — metade do raio de visão humano — + ondas sonoras quando late
      ctx.save();
      ctx.fillStyle =
        meggie.mode === 'barking'
          ? 'rgba(234, 179, 8, 0.28)'
          : 'rgba(250, 204, 21, 0.14)';
      ctx.beginPath();
      ctx.moveTo(meggie.x, meggie.y);
      ctx.arc(
        meggie.x,
        meggie.y,
        meggie.visionRange || 95,
        meggie.angle - (meggie.fov || 0.95) / 2,
        meggie.angle + (meggie.fov || 0.95) / 2
      );
      ctx.closePath();
      ctx.fill();

      if (meggie.mode === 'barking') {
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.85)';
        ctx.lineWidth = 2.5;
        const waveR = 18 + ((time * 80) % 50);
        ctx.beginPath();
        ctx.arc(meggie.x, meggie.y, waveR, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      this.drawMeggieSprite(ctx, meggie, time);
    }
  }

  drawSpikeSprite(ctx, spike, time) {
    ctx.save();
    ctx.translate(spike.x, spike.y);

    const isFighting = spike.mode === 'fighting';
    const isSleeping = spike.mode === 'sleeping' || spike.isLyingDown;
    const shakeX = isFighting ? Math.sin(time * 45) * 3 : 0;
    const shakeY = isFighting ? Math.cos(time * 38) * 2.5 : 0;
    ctx.translate(shakeX, shakeY);

    // Sombra no chão
    ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 11, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Costas pretas (visíveis na foto do Spike deitado)
    ctx.fillStyle = '#272524';
    ctx.beginPath();
    ctx.ellipse(-4, 4, 11, 8, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // Coleira xadrez vermelha e branca (detalhe da foto!)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(1, 0, 8.5, -Math.PI * 0.7, Math.PI * 0.2);
    ctx.stroke();
    ctx.strokeStyle = '#fecaca';
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.arc(1, 0, 8.5, -Math.PI * 0.7, Math.PI * 0.2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Peito e patinhas caramelo-palha (fiapo de manga)
    ctx.fillStyle = '#b6956a';
    ctx.beginPath();
    ctx.ellipse(3, 5, 8, 6, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Cabeça peluda espetada "fiapo de manga" (bege dourado/palha)
    ctx.fillStyle = '#cbb089';
    ctx.beginPath();
    ctx.arc(2, -3, 10, 0, Math.PI * 2);
    ctx.fill();

    // Fiapos de manga (mechas arrepiadas ao redor do rosto e bochechas)
    ctx.strokeStyle = '#d6bc94';
    ctx.lineWidth = 2;
    for (const [x1, y1, x2, y2] of [
      [-6, -6, -11, -8],
      [-7, -2, -12, -2],
      [-5, 2, -10, 5],
      [9, -6, 14, -8],
      [10, -2, 15, -1],
      [8, 2, 13, 5],
      [0, -11, -2, -15],
      [4, -11, 6, -15],
    ]) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Orelhas caídas/dobradas caramelo
    ctx.fillStyle = '#9c7e54';
    ctx.beginPath();
    ctx.ellipse(-6.5, -8, 4.5, 6.5, 0.45, 0, Math.PI * 2);
    ctx.ellipse(9.5, -8, 4.5, 6.5, -0.45, 0, Math.PI * 2);
    ctx.fill();

    // Focinho peludo e nariz preto grande (fiel à foto)
    ctx.fillStyle = '#bfa074';
    ctx.beginPath();
    ctx.ellipse(2, 0.5, 6.5, 4.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.ellipse(2, 0.5, 3.2, 2.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Olhos (fechados dormindo na foto quando deitado, ou abertos/bravos quando andando/brigando)
    ctx.strokeStyle = '#292524';
    ctx.fillStyle = '#18181b';
    ctx.lineWidth = 1.6;
    if (isSleeping) {
      ctx.beginPath();
      ctx.arc(-1.8, -4.2, 2.2, 0.15, Math.PI - 0.15);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(5.8, -4.2, 2.2, 0.15, Math.PI - 0.15);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(-1.8, -4.2, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(5.8, -4.2, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    if (isFighting) {
      ctx.font = '800 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💥💢', 0, -16);
    } else if (isSleeping) {
      ctx.fillStyle = '#93c5fd';
      ctx.font = '800 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💤', 11, -13 - Math.sin(time * 3) * 2);
    }

    ctx.fillStyle = '#78350f';
    ctx.font = '800 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Spike 🥭', 0, (spike.radius || 12) + 15);
    ctx.restore();
  }

  drawMeggieSprite(ctx, meggie, time) {
    ctx.save();
    ctx.translate(meggie.x, meggie.y);

    const wobble = Math.sin(time * 12) * 1.4;

    // Sombra pequena no chão
    ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 9, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rabinho escuro felpudo na lateral esquerda (como na foto)
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-6, 3 + wobble);
    ctx.quadraticCurveTo(-13, -1 + wobble, -12, -5 + wobble);
    ctx.stroke();

    // Corpinho pequeno cinza-aço/preto sedoso
    ctx.fillStyle = '#27272a';
    ctx.beginPath();
    ctx.ellipse(-1, 3 + wobble, 8.5, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Patinhas douradas
    ctx.fillStyle = '#b8894e';
    ctx.beginPath();
    ctx.arc(-4, 8 + wobble, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4, 8 - wobble, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Pingente branco de ossinho no pescoço (visível na foto!)
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(0, 3.5 + wobble, 2.6, 1.5, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // ORELHAS EM PÉ GRANDES E PELUDAS (marca registrada da Meggie!)
    ctx.fillStyle = '#c89d66';
    ctx.beginPath();
    ctx.ellipse(-7.5, -8.5 + wobble, 4.8, 7.5, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(7.5, -8.5 + wobble, 4.8, 7.5, 0.35, 0, Math.PI * 2);
    ctx.fill();
    // Mechas loiras claras nas orelhas em pé
    ctx.fillStyle = '#e8cfa2';
    ctx.beginPath();
    ctx.ellipse(-7.2, -8 + wobble, 2.8, 5.2, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(7.2, -8 + wobble, 2.8, 5.2, 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Rostinho pequeno dourado/loiro sedoso
    ctx.fillStyle = '#d4af7a';
    ctx.beginPath();
    ctx.arc(0, -3.5 + wobble, 7.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8cfa2';
    ctx.beginPath();
    ctx.arc(0, -5.5 + wobble, 5.5, Math.PI, Math.PI * 2);
    ctx.fill();

    // Olhinhos pretos vivos e brilhantes
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.arc(-2.6, -4.5 + wobble, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(2.6, -4.5 + wobble, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Narizinho preto
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.ellipse(0, -2 + wobble, 2.1, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#78350f';
    ctx.font = '800 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Meggie 🐾', 0, (meggie.radius || 9) + 15);
    ctx.restore();
  }

  drawPacoca(ctx, pacoca, time) {
    this.drawPacocaSprite(ctx, pacoca, time);
  }

  drawPacocaSprite(ctx, pacoca, time) {
    ctx.save();
    ctx.translate(pacoca.x, pacoca.y);

    if (pacoca.invulnTimer > 0 && Math.floor(time * 12) % 2 === 0) {
      ctx.globalAlpha = 0.55;
    }

    const wobble = pacoca.isMoving ? Math.sin(pacoca.furShakePhase) * 2.2 : 0;
    const tailWag = Math.sin(time * 18) * 4;

    // Sombra no chão
    ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 12, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rabinho peludo abanando atrás
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-8, 4 + wobble);
    ctx.quadraticCurveTo(-16, -2 + tailWag, -14, -8 + tailWag);
    ctx.stroke();

    // Patinhas animadas
    const legSwing = pacoca.isMoving ? Math.sin(pacoca.furShakePhase * 1.5) * 3 : 0;
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.arc(-6, 9 + legSwing, 3.2, 0, Math.PI * 2);
    ctx.arc(6, 9 - legSwing, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Corpo peludo preto/azul-aço (costas do Yorkshire)
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.ellipse(0, 3 + wobble, 12, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pelagem longa dourada/caramelo no peito e rosto (fiel à foto do Paçoca!)
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.arc(0, -3 + wobble, 10.5, 0, Math.PI * 2);
    ctx.fill();

    // Topete e mechas longas prateadas/loiras caindo para os dois lados (marca registrada da foto!)
    ctx.fillStyle = '#d6d3d1';
    ctx.beginPath();
    ctx.ellipse(-6, -5 + wobble, 5, 9, 0.35, 0, Math.PI * 2);
    ctx.ellipse(6, -5 + wobble, 5, 9, -0.35, 0, Math.PI * 2);
    ctx.ellipse(0, -10 + wobble, 7, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bigode/focinho caramelo claro
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.ellipse(0, -1 + wobble, 6.5, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Olhinhos pretos brilhantes
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.arc(-3.2, -5 + wobble, 1.6, 0, Math.PI * 2);
    ctx.arc(3.2, -5 + wobble, 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Focinho preto
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.ellipse(0, -1.5 + wobble, 2.8, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Linguinha rosa de fora (igual à foto!)
    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.ellipse(0, 2.2 + wobble, 2.3, 3, 0, 0, Math.PI);
    ctx.fill();

    // Gotinhas de água se estiver molhado/lento pela Stéfanny
    if (pacoca.slowTimer > 0) {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(-11, -8, 2.5, 0, Math.PI * 2);
      ctx.arc(11, -6, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#78350f';
    ctx.font = '800 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Paçoca 🐾', 0, pacoca.radius + 16);
    ctx.restore();
  }

  renderAvatarCanvas(canvasEl, characterId) {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    const w = canvasEl.width;
    const h = canvasEl.height;
    ctx.clearRect(0, 0, w, h);

    // Fundo circular estilizado
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    const scale = w / 46;
    ctx.scale(scale, scale);

    if (characterId === 'pacoca') {
      this.drawPacocaSprite(
        ctx,
        {
          x: 23,
          y: 23,
          radius: 11,
          invulnTimer: 0,
          slowTimer: 0,
          isMoving: false,
          furShakePhase: 0,
        },
        0
      );
    } else if (characterId === 'spike') {
      this.drawSpikeSprite(
        ctx,
        {
          x: 23,
          y: 24,
          radius: 12,
          mode: 'sleeping',
          isLyingDown: true,
        },
        0
      );
    } else if (characterId === 'meggie') {
      this.drawMeggieSprite(
        ctx,
        {
          x: 23,
          y: 25,
          radius: 9,
          mode: 'patrol',
        },
        0
      );
    } else {
      this.drawHumanSprite(
        ctx,
        {
          id: characterId,
          x: 23,
          y: 24,
          radius: 12,
          angle: 0,
          mode: 'patrol',
        },
        0
      );
    }
    ctx.restore();
  }

  drawSpeechBubbles(ctx, humans, pacoca) {
    for (const h of humans) {
      if (!h.speech || h.speechTimer <= 0) continue;
      if (
        pacoca &&
        h.mode !== 'screaming' &&
        !isPointVisibleToPacoca(
          h.x,
          h.y,
          pacoca.x,
          pacoca.y,
          this.visionRadius + 40,
          MAP_CONFIG.walls
        )
      ) {
        continue;
      }
      ctx.save();
      ctx.font = '700 11px system-ui, sans-serif';
      const textWidth = Math.min(220, ctx.measureText(h.speech).width + 16);
      const bx = Math.max(115, Math.min(MAP_CONFIG.width - 115, h.x));
      const by = Math.max(28, h.y - h.radius - 24);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
      ctx.strokeStyle = h.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bx - textWidth / 2, by - 12, textWidth, 22, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(h.speech, bx, by - 1, textWidth - 10);
      ctx.restore();
    }
  }
}
