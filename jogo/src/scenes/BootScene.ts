import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Aqui vao carregar os assets reais nas proximas sprints
    // Por enquanto, nada a carregar
  }

  create(): void {
    console.log('BootScene: inicializada');
    this.scene.start('TitleScene');
  }
}
