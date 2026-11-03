/**
 * Adaptador de Infraestrutura de Áudio (Web Audio API).
 * Traduz Eventos Sonoros do Domínio (`EventoSonoro`) em síntese de áudio no navegador.
 */
import { EventoSonoro } from '../../domain/partida-states.js';

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playTone(frequencyHz, durationSeconds, waveType = 'sine', volume = 0.12, delaySeconds = 0) {
    if (this.muted || !this.ctx) return;
    const startAt = this.ctx.currentTime + delaySeconds;
    const oscillator = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    oscillator.type = waveType;
    oscillator.frequency.setValueAtTime(frequencyHz, startAt);
    gainNode.gain.setValueAtTime(volume, startAt);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startAt + durationSeconds);
    oscillator.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + durationSeconds);
  }

  playEvent(soundEvent) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    switch (soundEvent) {
      case EventoSonoro.BIP_CAMERA:
        this.playTone(880, 0.12, 'square', 0.14, 0);
        this.playTone(1174, 0.16, 'square', 0.14, 0.14);
        break;
      case EventoSonoro.GRITO_EMILY:
        this.playTone(659, 0.15, 'sawtooth', 0.14, 0);
        this.playTone(987, 0.25, 'sawtooth', 0.16, 0.12);
        this.playTone(1174, 0.3, 'sawtooth', 0.14, 0.28);
        break;
      case EventoSonoro.CALL_TRABALHO:
        this.playTone(523, 0.12, 'triangle', 0.14, 0);
        this.playTone(659, 0.12, 'triangle', 0.14, 0.14);
        this.playTone(784, 0.2, 'triangle', 0.14, 0.28);
        break;
      case EventoSonoro.JATO_AGUA:
        this.playTone(240, 0.18, 'sawtooth', 0.15, 0);
        this.playTone(160, 0.22, 'triangle', 0.15, 0.1);
        break;
      case EventoSonoro.DISTRACAO:
        this.playTone(440, 0.12, 'sine', 0.12, 0);
        this.playTone(554, 0.18, 'sine', 0.12, 0.12);
        break;
      case EventoSonoro.XIXI_NO_CHAO:
        this.playTone(620, 0.08, 'sine', 0.12, 0);
        this.playTone(540, 0.1, 'sine', 0.12, 0.08);
        this.playTone(480, 0.14, 'sine', 0.12, 0.18);
        break;
      case EventoSonoro.XIXI_BLOQUEADO:
        this.playTone(190, 0.15, 'sawtooth', 0.1, 0);
        break;
      case EventoSonoro.BRIGA_SPIKE:
        this.playTone(180, 0.12, 'sawtooth', 0.16, 0);
        this.playTone(140, 0.14, 'sawtooth', 0.16, 0.1);
        this.playTone(210, 0.18, 'square', 0.15, 0.22);
        break;
      case EventoSonoro.LATIDO_MEGGIE:
        this.playTone(720, 0.09, 'triangle', 0.15, 0);
        this.playTone(860, 0.11, 'triangle', 0.15, 0.12);
        break;
      case EventoSonoro.CAPTURADO:
        this.playTone(392, 0.18, 'sawtooth', 0.15, 0);
        this.playTone(330, 0.2, 'sawtooth', 0.15, 0.18);
        this.playTone(261, 0.35, 'sawtooth', 0.16, 0.36);
        break;
      case EventoSonoro.PORTAO_ALCANCADO:
        this.playTone(523.25, 0.14, 'triangle', 0.16, 0);
        this.playTone(659.25, 0.14, 'triangle', 0.16, 0.14);
        this.playTone(783.99, 0.16, 'triangle', 0.16, 0.28);
        this.playTone(1046.5, 0.4, 'triangle', 0.2, 0.44);
        break;
    }
  }
}
