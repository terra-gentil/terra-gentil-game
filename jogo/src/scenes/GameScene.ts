import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE, COLORS } from '../config/GameConfig';

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private speed = 200;
  private cutTiles: Set<string> = new Set();
  private hudText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1B5E20');

    // Renderiza grid de gramado alto (placeholder)
    const gridCols = Math.ceil(GAME_WIDTH / TILE_SIZE);
    const gridRows = Math.ceil(GAME_HEIGHT / TILE_SIZE);

    for (let y = 0; y < gridRows; y++) {
      for (let x = 0; x < gridCols; x++) {
        const tile = this.add.rectangle(
          x * TILE_SIZE + TILE_SIZE / 2,
          y * TILE_SIZE + TILE_SIZE / 2,
          TILE_SIZE - 4,
          TILE_SIZE - 4,
          COLORS.GRASS_TALL
        );
        tile.setData('cut', false);
        tile.setData('gridX', x);
        tile.setData('gridY', y);
      }
    }

    // Player placeholder (Gentileza vai entrar na G9)
    this.player = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      TILE_SIZE * 0.8,
      TILE_SIZE * 0.8,
      COLORS.GENTILEZA_YELLOW
    );
    this.player.setStrokeStyle(4, COLORS.MOWER_ORANGE);

    this.cursors = this.input.keyboard!.createCursorKeys();

    // HUD
    this.hudText = this.add.text(20, 20, 'CORTADO: 0%  |  TOQUE NAS BORDAS PARA MOVER', {
      fontFamily: 'Arial Black',
      fontSize: '32px',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 4,
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: { x: 16, y: 8 },
    });
    this.hudText.setScrollFactor(0);
    this.hudText.setDepth(1000);

    // Touch controls placeholder: clica em borda da tela pra mover
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const dx = pointer.worldX - this.player.x;
      const dy = pointer.worldY - this.player.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        this.player.setData('moveX', Math.sign(dx));
        this.player.setData('moveY', 0);
      } else {
        this.player.setData('moveX', 0);
        this.player.setData('moveY', Math.sign(dy));
      }
    });

    console.log('GameScene: inicializada');
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    let dx = 0;
    let dy = 0;

    if (this.cursors.left.isDown) dx = -1;
    else if (this.cursors.right.isDown) dx = 1;
    else if (this.cursors.up.isDown) dy = -1;
    else if (this.cursors.down.isDown) dy = 1;

    if (dx === 0 && dy === 0) {
      dx = this.player.getData('moveX') || 0;
      dy = this.player.getData('moveY') || 0;
    }

    this.player.x += dx * this.speed * dt;
    this.player.y += dy * this.speed * dt;

    // Limita aos bounds
    this.player.x = Phaser.Math.Clamp(this.player.x, TILE_SIZE / 2, GAME_WIDTH - TILE_SIZE / 2);
    this.player.y = Phaser.Math.Clamp(this.player.y, TILE_SIZE / 2, GAME_HEIGHT - TILE_SIZE / 2);

    // "Corta" tile onde o jogador esta
    const gridX = Math.floor(this.player.x / TILE_SIZE);
    const gridY = Math.floor(this.player.y / TILE_SIZE);
    const key = `${gridX},${gridY}`;

    if (!this.cutTiles.has(key)) {
      this.cutTiles.add(key);
      this.markTileCut(gridX, gridY);
      this.updateHud();
    }
  }

  private markTileCut(gridX: number, gridY: number): void {
    const tiles = this.children.list.filter(obj => {
      return obj instanceof Phaser.GameObjects.Rectangle &&
             obj.getData('gridX') === gridX &&
             obj.getData('gridY') === gridY &&
             obj !== this.player;
    });

    tiles.forEach(tile => {
      (tile as Phaser.GameObjects.Rectangle).setFillStyle(COLORS.GRASS_CUT);
      (tile as Phaser.GameObjects.Rectangle).setData('cut', true);
    });
  }

  private updateHud(): void {
    const totalTiles = Math.ceil(GAME_WIDTH / TILE_SIZE) * Math.ceil(GAME_HEIGHT / TILE_SIZE);
    const pct = Math.round((this.cutTiles.size / totalTiles) * 100);
    this.hudText.setText(`CORTADO: ${pct}%  |  USE SETAS OU TOQUE PRA MOVER`);
  }
}
