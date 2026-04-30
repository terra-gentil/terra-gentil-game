import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1B5E20');

    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 3, 'GENTILEZA', {
      fontFamily: 'Arial Black',
      fontSize: '96px',
      color: '#F5C97E',
      stroke: '#000000',
      strokeThickness: 8,
    });
    title.setOrigin(0.5);

    const subtitle = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 3 + 100, 'Resgate dos Jardins', {
      fontFamily: 'Arial',
      fontSize: '48px',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 4,
    });
    subtitle.setOrigin(0.5);

    const startButton = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.7, 'TOQUE PARA JOGAR', {
      fontFamily: 'Arial',
      fontSize: '40px',
      color: '#FFFFFF',
      backgroundColor: '#3A7BD5',
      padding: { x: 40, y: 20 },
    });
    startButton.setOrigin(0.5);
    startButton.setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: startButton,
      alpha: 0.7,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    startButton.on('pointerdown', () => {
      this.scene.start('GameScene');
    });

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 40, 'Gentileza é marca registrada de Terra Gentil', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#FFFFFF',
    }).setOrigin(0.5).setAlpha(0.6);

    console.log('TitleScene: inicializada');
  }
}
