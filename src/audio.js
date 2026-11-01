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

  playTone(freq, duration, type = 'sine', volume = 0.12, delay = 0) {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  playEvent(event) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    switch (event) {
      case 'camera_beep':
        this.playTone(880, 0.12, 'square', 0.14, 0);
        this.playTone(1174, 0.16, 'square', 0.14, 0.14);
        break;
      case 'emily_scream':
        this.playTone(659, 0.15, 'sawtooth', 0.14, 0);
        this.playTone(987, 0.25, 'sawtooth', 0.16, 0.12);
        this.playTone(1174, 0.3, 'sawtooth', 0.14, 0.28);
        break;
      case 'work_call':
        this.playTone(523, 0.12, 'triangle', 0.14, 0);
        this.playTone(659, 0.12, 'triangle', 0.14, 0.14);
        this.playTone(784, 0.2, 'triangle', 0.14, 0.28);
        break;
      case 'splash':
        this.playTone(240, 0.18, 'sawtooth', 0.15, 0);
        this.playTone(160, 0.22, 'triangle', 0.15, 0.1);
        break;
      case 'distraction':
        this.playTone(440, 0.12, 'sine', 0.12, 0);
        this.playTone(554, 0.18, 'sine', 0.12, 0.12);
        break;
      case 'pee':
        this.playTone(620, 0.08, 'sine', 0.12, 0);
        this.playTone(540, 0.1, 'sine', 0.12, 0.08);
        this.playTone(480, 0.14, 'sine', 0.12, 0.18);
        break;
      case 'pee_blocked':
        this.playTone(190, 0.15, 'sawtooth', 0.1, 0);
        break;
      case 'dog_fight':
        this.playTone(180, 0.12, 'sawtooth', 0.16, 0);
        this.playTone(140, 0.14, 'sawtooth', 0.16, 0.1);
        this.playTone(210, 0.18, 'square', 0.15, 0.22);
        break;
      case 'dog_bark':
        this.playTone(720, 0.09, 'triangle', 0.15, 0);
        this.playTone(860, 0.11, 'triangle', 0.15, 0.12);
        break;
      case 'captured':
        this.playTone(392, 0.18, 'sawtooth', 0.15, 0);
        this.playTone(330, 0.2, 'sawtooth', 0.15, 0.18);
        this.playTone(261, 0.35, 'sawtooth', 0.16, 0.36);
        break;
      case 'win':
        this.playTone(523.25, 0.14, 'triangle', 0.16, 0);
        this.playTone(659.25, 0.14, 'triangle', 0.16, 0.14);
        this.playTone(783.99, 0.16, 'triangle', 0.16, 0.28);
        this.playTone(1046.5, 0.4, 'triangle', 0.2, 0.44);
        break;
    }
  }
}
