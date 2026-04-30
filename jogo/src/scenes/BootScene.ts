import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.load.json('niveis', 'assets/maps/niveis.json');
  }

  create(): void {
    console.log('BootScene: assets carregados');
    this.scene.start('TitleScene');
  }
}
