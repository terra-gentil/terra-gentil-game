import Phaser from 'phaser';
import { sfx } from '../audio/SfxPlayer';
import { SFX_KEYS, SFX_PATHS, USE_OGG_SFX } from '../config/Constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.load.json('niveis', 'assets/maps/niveis.json');

    if (USE_OGG_SFX) {
      // Se algum OGG estiver faltando em public/assets/audio/, dispara loaderror.
      // Logamos e seguimos: SfxPlayer.attachScene checa o cache e cai em fallback
      // sintetizado se a colecao nao estiver completa.
      this.load.on('loaderror', (file: { key: string }) => {
        console.warn(`SFX OGG ausente: ${file.key} (fallback synth ativo).`);
      });
      (Object.keys(SFX_PATHS) as Array<keyof typeof SFX_PATHS>).forEach((k) => {
        this.load.audio(SFX_KEYS[k], SFX_PATHS[k]);
      });
    }
  }

  create(): void {
    sfx.attachScene(this);
    console.log('BootScene: assets carregados');
    this.scene.start('TitleScene');
  }
}
