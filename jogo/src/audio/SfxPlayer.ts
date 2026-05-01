/**
 * SFX em modo dual:
 *  - Default ('synth'): sintetizados via Web Audio API. Sem dependencia de assets.
 *  - 'ogg': carregados pelo Phaser sound (this.scene.sound.play(key)). Ativa quando
 *    USE_OGG_SFX=true em Constants.ts e os 6 OGG existem em public/assets/audio/.
 *
 * Interface publica (cut/penaltyFlowers/.../gameOver) inalterada — facade.
 *
 * AudioContext (modo synth) e criado lazy na primeira chamada de play() pra respeitar
 * a politica de auto-play dos browsers (precisa de user gesture).
 */

import Phaser from 'phaser';
import { SFX_KEYS, USE_OGG_SFX } from '../config/Constants';

type OscType = 'sine' | 'square' | 'triangle' | 'sawtooth';
type SfxKey = keyof typeof SFX_KEYS;

export class SfxPlayer {
  private ctx?: AudioContext;
  private muted = false;
  private soundManager?: Phaser.Sound.BaseSoundManager;
  private oggReady = false;

  setMuted(m: boolean): void {
    this.muted = m;
  }

  isMuted(): boolean {
    return this.muted;
  }

  /**
   * Aponta o SfxPlayer pra um Phaser.Sound.BaseSoundManager e checa se os 6 OGG
   * estao no cache. Se sim e USE_OGG_SFX=true, switcha pra modo OGG.
   * Caso contrario, fica no synth atual.
   * Chamar em BootScene.create() apos preload (e idempotente).
   */
  attachScene(scene: Phaser.Scene): void {
    if (this.soundManager) return;
    if (!USE_OGG_SFX) return;
    const allLoaded = (Object.values(SFX_KEYS) as string[]).every((k) =>
      scene.cache.audio.exists(k),
    );
    if (!allLoaded) return;
    this.soundManager = scene.sound;
    this.oggReady = true;
  }

  /**
   * Inicializa o AudioContext (synth) dentro de um handler de user gesture.
   * Chamado no botao JOGAR (Title) pra warm-up: sem isso, em mobile Safari
   * o primeiro SFX (sfx.cut() de 50ms) pode rodar com context ainda em
   * estado suspended e ser silenciado.
   *
   * Em modo OGG, prime() e no-op (Phaser ja gerencia AudioContext internamente).
   */
  prime(): void {
    if (this.oggReady) return;
    this.ensureContext();
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
   * Toca uma nota sintetizada com envelope ataque-decay simples.
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

    osc.addEventListener('ended', () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        // ja desconectado, ignora
      }
    });
  }

  private playOgg(key: SfxKey, volume = 0.6): boolean {
    if (this.muted) return true;
    if (!this.oggReady || !this.soundManager) return false;
    try {
      this.soundManager.play(SFX_KEYS[key], { volume });
      return true;
    } catch {
      return false;
    }
  }

  // ----- Eventos do jogo -----

  cut(): void {
    if (this.playOgg('cut', 0.5)) return;
    this.playTone(180, 50, 'square', 0.08);
  }

  penaltyFlowers(): void {
    if (this.playOgg('penaltyFlowers', 0.6)) return;
    this.playTone(440, 80, 'triangle', 0.12);
    this.playTone(220, 100, 'triangle', 0.10, 80);
  }

  penaltyStone(): void {
    if (this.playOgg('penaltyStone', 0.7)) return;
    this.playTone(90, 220, 'square', 0.20);
    this.playTone(60, 250, 'sawtooth', 0.10, 60);
  }

  fuelPickup(): void {
    if (this.playOgg('fuelPickup', 0.6)) return;
    this.playTone(523, 80, 'sine', 0.18);
    this.playTone(659, 80, 'sine', 0.18, 80);
    this.playTone(784, 140, 'sine', 0.20, 160);
  }

  levelClear(): void {
    if (this.playOgg('levelClear', 0.7)) return;
    [440, 554, 659, 880].forEach((freq, i) => {
      this.playTone(freq, 180, 'square', 0.16, i * 110);
    });
  }

  gameOver(): void {
    if (this.playOgg('gameOver', 0.6)) return;
    this.playTone(220, 220, 'square', 0.16);
    this.playTone(165, 280, 'square', 0.14, 220);
    this.playTone(110, 460, 'sawtooth', 0.12, 480);
  }
}

export const sfx = new SfxPlayer();
