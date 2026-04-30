import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.load.json('fase_01', 'assets/maps/fase_01.json');
  }

  create(): void {
    console.log('BootScene: assets carregados');
    this.scene.start('TitleScene');
  }
}
