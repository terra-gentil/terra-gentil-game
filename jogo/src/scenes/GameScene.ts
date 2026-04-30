import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE, COLORS } from '../config/GameConfig';
import { TILE, type LevelJson } from '../types/Level';

type Dir = 'NONE' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';

const DIR_VEC: Record<Dir, { x: number; y: number }> = {
  NONE: { x: 0, y: 0 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
};

const TILE_COLOR: Record<number, number> = {
  [TILE.CUT]: COLORS.GRASS_CUT,
  [TILE.TALL]: COLORS.GRASS_TALL,
  [TILE.FLOWERS]: 0xE91E63,
  [TILE.STONE]: 0x8E8E8E,
};

export class GameScene extends Phaser.Scene {
  private level!: LevelJson;
  private tileGrid: Phaser.GameObjects.Rectangle[][] = [];
  private originX = 0;
  private originY = 0;

  private player!: Phaser.GameObjects.Rectangle;
  private playerTileX = 0;
  private playerTileY = 0;
  private dir: Dir = 'NONE';
  private pendingDir: Dir = 'NONE';
  private speed = 240;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private hudText!: Phaser.GameObjects.Text;
  private cutCount = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.level = this.cache.json.get('fase_01') as LevelJson;
    if (!this.level) {
      console.error('fase_01 nao carregou');
      return;
    }

    this.cameras.main.setBackgroundColor('#0E3211');

    const W = this.level.largura_efetiva_tiles;
    const H = this.level.altura_tiles;
    const worldW = W * TILE_SIZE;
    const worldH = H * TILE_SIZE;
    this.originX = Math.round((GAME_WIDTH - worldW) / 2);
    this.originY = Math.round((GAME_HEIGHT - worldH) / 2);

    this.add.rectangle(
      this.originX + worldW / 2,
      this.originY + worldH / 2,
      worldW + 16,
      worldH + 16,
      0x000000,
      0.4
    );

    for (let row = 0; row < H; row++) {
      this.tileGrid[row] = [];
      for (let col = 0; col < W; col++) {
        const type = this.level.tiles[row][col];
        const color = TILE_COLOR[type] ?? 0x222222;
        const rect = this.add.rectangle(
          this.originX + col * TILE_SIZE + TILE_SIZE / 2,
          this.originY + row * TILE_SIZE + TILE_SIZE / 2,
          TILE_SIZE - 2,
          TILE_SIZE - 2,
          color
        );
        rect.setData('type', type);
        this.tileGrid[row][col] = rect;
      }
    }

    this.playerTileX = this.level.spawn_jogador.editor_x;
    this.playerTileY = this.level.spawn_jogador.editor_y;
    const px = this.tileToPx(this.playerTileX);
    const py = this.tileToPy(this.playerTileY);
    this.player = this.add.rectangle(
      px,
      py,
      TILE_SIZE * 0.7,
      TILE_SIZE * 0.7,
      COLORS.GENTILEZA_YELLOW
    );
    this.player.setStrokeStyle(4, COLORS.MOWER_ORANGE);
    this.player.setDepth(10);

    this.cursors = this.input.keyboard!.createCursorKeys();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const dx = pointer.worldX - this.player.x;
      const dy = pointer.worldY - this.player.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        this.requestDir(dx > 0 ? 'RIGHT' : 'LEFT');
      } else {
        this.requestDir(dy > 0 ? 'DOWN' : 'UP');
      }
    });

    const hudBg = this.add.rectangle(GAME_WIDTH / 2, 36, GAME_WIDTH, 72, 0x000000, 0.6);
    hudBg.setDepth(999);
    this.hudText = this.add.text(GAME_WIDTH / 2, 36, '', {
      fontFamily: 'Arial Black',
      fontSize: '36px',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 4,
    });
    this.hudText.setOrigin(0.5);
    this.hudText.setDepth(1000);
    this.updateHud();

    if (this.level.tiles[this.playerTileY][this.playerTileX] === TILE.TALL) {
      this.cutTileAt(this.playerTileX, this.playerTileY);
    }
  }

  private tileToPx(tileX: number): number {
    return this.originX + tileX * TILE_SIZE + TILE_SIZE / 2;
  }

  private tileToPy(tileY: number): number {
    return this.originY + tileY * TILE_SIZE + TILE_SIZE / 2;
  }

  private requestDir(d: Dir): void {
    if (d === this.dir) return;
    this.pendingDir = d;
    if (this.dir === 'NONE') {
      this.dir = d;
      this.pendingDir = 'NONE';
    }
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.readInput();

    if (this.dir === 'NONE') return;

    const v = DIR_VEC[this.dir];
    const oldPx = this.player.x;
    const oldPy = this.player.y;
    const newPx = oldPx + v.x * this.speed * dt;
    const newPy = oldPy + v.y * this.speed * dt;

    const targetTileX = this.playerTileX + v.x;
    const targetTileY = this.playerTileY + v.y;

    if (!this.canEnter(targetTileX, targetTileY)) {
      // Trava na borda do tile atual
      const cx = this.tileToPx(this.playerTileX);
      const cy = this.tileToPy(this.playerTileY);
      this.player.x = cx;
      this.player.y = cy;
      this.dir = 'NONE';
      return;
    }

    this.player.x = newPx;
    this.player.y = newPy;

    const targetCx = this.tileToPx(targetTileX);
    const targetCy = this.tileToPy(targetTileY);

    const reached =
      (v.x !== 0 && Math.sign(targetCx - oldPx) !== Math.sign(targetCx - newPx)) ||
      (v.y !== 0 && Math.sign(targetCy - oldPy) !== Math.sign(targetCy - newPy)) ||
      (this.player.x === targetCx && this.player.y === targetCy);

    if (reached) {
      this.player.x = targetCx;
      this.player.y = targetCy;
      this.playerTileX = targetTileX;
      this.playerTileY = targetTileY;
      this.onEnterTile(this.playerTileX, this.playerTileY);

      if (this.pendingDir !== 'NONE' && this.pendingDir !== this.dir) {
        const pv = DIR_VEC[this.pendingDir];
        if (this.canEnter(this.playerTileX + pv.x, this.playerTileY + pv.y)) {
          this.dir = this.pendingDir;
        }
        this.pendingDir = 'NONE';
      }
    }
  }

  private readInput(): void {
    if (this.cursors.left.isDown) this.requestDir('LEFT');
    else if (this.cursors.right.isDown) this.requestDir('RIGHT');
    else if (this.cursors.up.isDown) this.requestDir('UP');
    else if (this.cursors.down.isDown) this.requestDir('DOWN');
  }

  private canEnter(tx: number, ty: number): boolean {
    if (tx < 0 || ty < 0) return false;
    if (tx >= this.level.largura_efetiva_tiles) return false;
    if (ty >= this.level.altura_tiles) return false;
    return true;
  }

  private onEnterTile(tx: number, ty: number): void {
    const type = this.level.tiles[ty][tx];
    if (type === TILE.TALL) {
      this.cutTileAt(tx, ty);
    }
  }

  private cutTileAt(tx: number, ty: number): void {
    this.level.tiles[ty][tx] = TILE.CUT;
    this.tileGrid[ty][tx].setFillStyle(COLORS.GRASS_CUT);
    this.cutCount++;
    this.updateHud();
    if (this.cutCount >= this.level.grama_alta_para_cortar) {
      this.hudText.setText(`FASE ${this.level.id} COMPLETA!`);
    }
  }

  private updateHud(): void {
    const target = this.level.grama_alta_para_cortar;
    const pct = Math.round((this.cutCount / target) * 100);
    this.hudText.setText(
      `FASE ${this.level.id}  |  CORTADO ${this.cutCount}/${target}  (${pct}%)`
    );
  }
}
