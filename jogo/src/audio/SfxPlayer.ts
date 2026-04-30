/**
 * SFX sintetizados via Web Audio API.
 *
 * Implementacao temporaria pra G6 sem dependencia de assets.
 * Quando os .ftm originais forem exportados em OGG via FamiStudio,
 * trocar pra usar Phaser sound (this.sound.play(key)) no GameScene.
 *
 * AudioContext e criado lazy na primeira chamada de play() pra respeitar
 * a politica de auto-play dos browsers (precisa de user gesture).
 */

type OscType = 'sine' | 'square' | 'triangle' | 'sawtooth';

export class SfxPlayer {
  private ctx?: AudioContext;
  private muted = false;

  setMuted(m: boolean): void {
    this.muted = m;
  }

  isMuted(): boolean {
    return this.muted;
  }

  private ensureContext(): AudioContext | undefined {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return undefined;
      this.ctx = new Ctor();
      return this.ctx;
    } catch {
      return undefined;
    }
  }

  /**
   * Toca uma nota com envelope ataque-decay simples.
   * @param freq frequencia em Hz
   * @param durationMs duracao total
   * @param type forma de onda
   * @param volume 0..1
   * @param delayMs atraso antes de iniciar
   */
  private playTone(
    freq: number,
    durationMs: number,
    type: OscType = 'square',
    volume = 0.15,
    delayMs = 0
  ): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;

    const start = ctx.currentTime + delayMs / 1000;
    const dur = durationMs / 1000;

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur);
  }

  // ----- Eventos do jogo -----

  /** Cortar grama: pulso curto e seco */
  cut(): void {
    this.playTone(180, 50, 'square', 0.08);
  }

  /** Pisar flor: 2 tons descendentes */
  penaltyFlowers(): void {
    this.playTone(440, 80, 'triangle', 0.12);
    this.playTone(220, 100, 'triangle', 0.10, 80);
  }

  /** Pisar pedra: thump grave */
  penaltyStone(): void {
    this.playTone(90, 220, 'square', 0.20);
    this.playTone(60, 250, 'sawtooth', 0.10, 60);
  }

  /** Pegar galao: arpejo ascendente C-E-G */
  fuelPickup(): void {
    this.playTone(523, 80, 'sine', 0.18);   // C5
    this.playTone(659, 80, 'sine', 0.18, 80);  // E5
    this.playTone(784, 140, 'sine', 0.20, 160); // G5
  }

  /** Fase completa: 4 notas ascendentes alegres */
  levelClear(): void {
    [440, 554, 659, 880].forEach((freq, i) => {
      this.playTone(freq, 180, 'square', 0.16, i * 110);
    });
  }

  /** Game over: 3 notas descendentes tristes */
  gameOver(): void {
    this.playTone(220, 220, 'square', 0.16);
    this.playTone(165, 280, 'square', 0.14, 220);
    this.playTone(110, 460, 'sawtooth', 0.12, 480);
  }
}

export const sfx = new SfxPlayer();
