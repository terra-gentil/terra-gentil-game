import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.load.json('niveis', 'assets/maps/niveis.json');
    this.load.spritesheet('gentileza', 'assets/sprites/gentileza.png', {
      frameWidth: 64,
      frameHeight: 90,
    });
  }

  create(): void {
    // Animations do mascote Gentileza. Spritesheet linear de 12 frames:
    //   0: idle_down       1: walk_down
    //   2: idle_up         3: walk_up
    //   4: idle_left       5,6: walk_left_a/b
    //   7: idle_right      8,9,10,11: walk_right_a/b/c/d
    //
    // walk_right tem 4 frames (anim mais fluida) porque foi a direcao
    // com mais material do gerador. As outras direcoes tem 2 frames
    // (idle + 1 walk alternando dao impressao de bobble).
    const spr = 'gentileza';
    this.anims.create({ key: 'g-idle-down',  frames: [{ key: spr, frame: 0 }] });
    this.anims.create({
      key: 'g-walk-down',
      frames: this.anims.generateFrameNumbers(spr, { frames: [0, 1] }),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({ key: 'g-idle-up',  frames: [{ key: spr, frame: 2 }] });
    this.anims.create({
      key: 'g-walk-up',
      frames: this.anims.generateFrameNumbers(spr, { frames: [2, 3] }),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({ key: 'g-idle-left',  frames: [{ key: spr, frame: 4 }] });
    this.anims.create({
      key: 'g-walk-left',
      frames: this.anims.generateFrameNumbers(spr, { frames: [5, 6] }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({ key: 'g-idle-right',  frames: [{ key: spr, frame: 7 }] });
    this.anims.create({
      key: 'g-walk-right',
      frames: this.anims.generateFrameNumbers(spr, { frames: [8, 9, 10, 11] }),
      frameRate: 10,
      repeat: -1,
    });

    console.log('BootScene: assets carregados');
    this.scene.start('TitleScene');
  }
}
