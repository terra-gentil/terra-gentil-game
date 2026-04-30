import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE, COLORS } from '../config/GameConfig';
import { TILE, type AllLevelsJson, type LevelJson } from '../types/Level';

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

const HUD_HEIGHT = 80;

const FUEL_MAX = 100;
const FUEL_DECAY_INTERVAL_MS = 500;
const PENALTY_FLOWERS = 12;
const PENALTY_STONE = 25;
// Tempo entre spawns de galao por nivel (ms). Indices 0..9 = fases 1..10.
const FUEL_SPAWN_MS = [10000, 9000, 8000, 7000, 6500, 6000, 5500, 5500, 5500, 5500];

interface SceneData {
  levelIndex?: number;
}

interface FuelBarrel {
  tileX: number;
  tileY: number;
  sprite: Phaser.GameObjects.Rectangle;
  tween: Phaser.Tweens.Tween;
}

export class GameScene extends Phaser.Scene {
  private allLevels!: AllLevelsJson;
  private level!: LevelJson;
  private levelIndex = 0;
  private tileGrid: Phaser.GameObjects.Rectangle[][] = [];

  private worldW = 0;
  private worldH = 0;
  private worldOffsetY = 0;

  private player!: Phaser.GameObjects.Rectangle;
  private playerTileX = 0;
  private playerTileY = 0;
  private dir: Dir = 'NONE';
  private pendingDir: Dir = 'NONE';
  private speed = 240;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private hudText!: Phaser.GameObjects.Text;
  private fuelBarBg!: Phaser.GameObjects.Rectangle;
  private fuelBarFill!: Phaser.GameObjects.Rectangle;
  private fuelLabel!: Phaser.GameObjects.Text;
  private centerMessage?: Phaser.GameObjects.Text;
  private cutCount = 0;
  private levelCleared = false;

  private fuel = FUEL_MAX;
  private fuelDecAccumMs = 0;
  private fuelBarrel?: FuelBarrel;
  private fuelSpawnTimer?: Phaser.Time.TimerEvent;
  private gameOver = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: SceneData): void {
    this.levelIndex = data.levelIndex ?? 0;
    this.dir = 'NONE';
    this.pendingDir = 'NONE';
    this.cutCount = 0;
    this.levelCleared = false;
    this.tileGrid = [];
    this.centerMessage = undefined;
    this.fuel = FUEL_MAX;
    this.fuelDecAccumMs = 0;
    this.fuelBarrel = undefined;
    this.fuelSpawnTimer = undefined;
    this.gameOver = false;
  }

  create(): void {
    this.allLevels = this.cache.json.get('niveis') as AllLevelsJson;
    if (!this.allLevels || !this.allLevels[this.levelIndex]) {
      console.error('Nivel nao encontrado', this.levelIndex);
      this.scene.start('TitleScene');
      return;
    }

    // Clone profundo pra nao mutar o JSON cacheado entre runs
    this.level = JSON.parse(JSON.stringify(this.allLevels[this.levelIndex])) as LevelJson;

    this.cameras.main.setBackgroundColor('#0E3211');

    const W = this.level.largura_efetiva_tiles;
    const H = this.level.altura_tiles;
    this.worldW = W * TILE_SIZE;
    this.worldH = H * TILE_SIZE;
    const playableTop = HUD_HEIGHT;
    const playableH = GAME_HEIGHT - playableTop;
    this.worldOffsetY = playableTop + Math.round((playableH - this.worldH) / 2);

    const cameraWorldW = Math.max(this.worldW, GAME_WIDTH);
    this.cameras.main.setBounds(0, 0, cameraWorldW, GAME_HEIGHT);

    this.add.rectangle(
      this.worldOffsetX() + this.worldW / 2,
      this.worldOffsetY + this.worldH / 2,
      this.worldW + 16,
      this.worldH + 16,
      0x000000,
      0.4
    );

    for (let row = 0; row < H; row++) {
      this.tileGrid[row] = [];
      for (let col = 0; col < W; col++) {
        const type = this.level.tiles[row][col];
        const color = TILE_COLOR[type] ?? 0x222222;
        const rect = this.add.rectangle(
          this.tileToPx(col),
          this.tileToPy(row),
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
    this.player = this.add.rectangle(
      this.tileToPx(this.playerTileX),
      this.tileToPy(this.playerTileY),
      TILE_SIZE * 0.7,
      TILE_SIZE * 0.7,
      COLORS.GENTILEZA_YELLOW
    );
    this.player.setStrokeStyle(4, COLORS.MOWER_ORANGE);
    this.player.setDepth(10);

    this.cameras.main.startFollow(this.player, false, 0.1, 0, -GAME_WIDTH / 2 + this.player.x, 0);

    this.cursors = this.input.keyboard!.createCursorKeys();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.levelCleared) {
        this.advanceLevel();
        return;
      }
      if (this.gameOver) {
        this.restartLevel();
        return;
      }
      const dx = pointer.worldX - this.player.x;
      const dy = pointer.worldY - this.player.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        this.requestDir(dx > 0 ? 'RIGHT' : 'LEFT');
      } else {
        this.requestDir(dy > 0 ? 'DOWN' : 'UP');
      }
    });

    this.input.keyboard!.on('keydown-SPACE', () => {
      if (this.levelCleared) this.advanceLevel();
      else if (this.gameOver) this.restartLevel();
    });
    this.input.keyboard!.on('keydown-ENTER', () => {
      if (this.levelCleared) this.advanceLevel();
      else if (this.gameOver) this.restartLevel();
    });
    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('TitleScene'));

    this.buildHud();
    this.updateHud();
    this.updateFuelBar();

    if (this.level.tiles[this.playerTileY][this.playerTileX] === TILE.TALL) {
      this.cutTileAt(this.playerTileX, this.playerTileY);
    }

    this.scheduleFuelSpawn();
  }

  private buildHud(): void {
    const hudBg = this.add.rectangle(GAME_WIDTH / 2, HUD_HEIGHT / 2, GAME_WIDTH, HUD_HEIGHT, 0x000000, 0.7);
    hudBg.setScrollFactor(0);
    hudBg.setDepth(999);

    this.hudText = this.add.text(40, HUD_HEIGHT / 2, '', {
      fontFamily: 'Arial Black',
      fontSize: '32px',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 4,
    });
    this.hudText.setOrigin(0, 0.5);
    this.hudText.setScrollFactor(0);
    this.hudText.setDepth(1000);

    const fuelBarW = 320;
    const fuelBarH = 32;
    const fuelBarX = GAME_WIDTH - 40 - fuelBarW;
    const fuelBarY = HUD_HEIGHT / 2;

    this.fuelBarBg = this.add.rectangle(
      fuelBarX + fuelBarW / 2,
      fuelBarY,
      fuelBarW,
      fuelBarH,
      0x222222
    );
    this.fuelBarBg.setStrokeStyle(3, 0xFFFFFF);
    this.fuelBarBg.setScrollFactor(0).setDepth(1000);

    this.fuelBarFill = this.add.rectangle(
      fuelBarX + 3,
      fuelBarY,
      fuelBarW - 6,
      fuelBarH - 6,
      COLORS.GENTILEZA_LEAF
    );
    this.fuelBarFill.setOrigin(0, 0.5);
    this.fuelBarFill.setScrollFactor(0).setDepth(1001);
    this.fuelBarFill.setData('maxWidth', fuelBarW - 6);

    this.fuelLabel = this.add.text(fuelBarX + fuelBarW / 2, fuelBarY, '', {
      fontFamily: 'Arial Black',
      fontSize: '20px',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 3,
    });
    this.fuelLabel.setOrigin(0.5);
    this.fuelLabel.setScrollFactor(0).setDepth(1002);
  }

  private worldOffsetX(): number {
    return this.worldW < GAME_WIDTH ? Math.round((GAME_WIDTH - this.worldW) / 2) : 0;
  }

  private tileToPx(tileX: number): number {
    return this.worldOffsetX() + tileX * TILE_SIZE + TILE_SIZE / 2;
  }

  private tileToPy(tileY: number): number {
    return this.worldOffsetY + tileY * TILE_SIZE + TILE_SIZE / 2;
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
    if (this.levelCleared || this.gameOver) return;
    const dt = delta / 1000;
    this.readInput();

    // Decremento de combustivel: so quando se movendo (mesmo modelo do original)
    if (this.dir !== 'NONE') {
      this.fuelDecAccumMs += delta;
      while (this.fuelDecAccumMs >= FUEL_DECAY_INTERVAL_MS) {
        this.fuelDecAccumMs -= FUEL_DECAY_INTERVAL_MS;
        this.fuel = Math.max(0, this.fuel - 1);
      }
      this.updateFuelBar();
      if (this.fuel <= 0) {
        this.triggerGameOver();
        return;
      }
    }

    if (this.dir === 'NONE') return;

    const v = DIR_VEC[this.dir];
    const oldPx = this.player.x;
    const oldPy = this.player.y;
    const newPx = oldPx + v.x * this.speed * dt;
    const newPy = oldPy + v.y * this.speed * dt;

    const targetTileX = this.playerTileX + v.x;
    const targetTileY = this.playerTileY + v.y;

    if (!this.canEnter(targetTileX, targetTileY)) {
      this.player.x = this.tileToPx(this.playerTileX);
      this.player.y = this.tileToPy(this.playerTileY);
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

      if (this.gameOver || this.levelCleared) return;

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
    // Pickup de galao tem prioridade
    if (this.fuelBarrel && this.fuelBarrel.tileX === tx && this.fuelBarrel.tileY === ty) {
      this.onPickupFuel();
      return;
    }

    const type = this.level.tiles[ty][tx];
    if (type === TILE.TALL) {
      this.cutTileAt(tx, ty);
    } else if (type === TILE.FLOWERS) {
      this.applyFuelPenalty(PENALTY_FLOWERS);
      this.level.tiles[ty][tx] = TILE.CUT;
      this.tileGrid[ty][tx].setFillStyle(COLORS.GRASS_CUT);
    } else if (type === TILE.STONE) {
      this.applyFuelPenalty(PENALTY_STONE);
      this.cameras.main.shake(250, 0.008);
    }
  }

  private applyFuelPenalty(amount: number): void {
    this.fuel = Math.max(0, this.fuel - amount);
    this.updateFuelBar();
    if (this.fuel <= 0) {
      this.triggerGameOver();
    }
  }

  private cutTileAt(tx: number, ty: number): void {
    this.level.tiles[ty][tx] = TILE.CUT;
    this.tileGrid[ty][tx].setFillStyle(COLORS.GRASS_CUT);
    this.cutCount++;
    this.updateHud();
    if (this.cutCount >= this.level.grama_alta_para_cortar) {
      this.onLevelClear();
    }
  }

  private updateHud(): void {
    const target = this.level.grama_alta_para_cortar;
    const pct = Math.round((this.cutCount / target) * 100);
    this.hudText.setText(
      `FASE ${this.level.id}/10  CORTADO ${this.cutCount}/${target} (${pct}%)`
    );
  }

  private updateFuelBar(): void {
    const ratio = this.fuel / FUEL_MAX;
    const maxWidth = this.fuelBarFill.getData('maxWidth') as number;
    this.fuelBarFill.width = maxWidth * ratio;

    let color: number;
    if (ratio > 0.5) color = COLORS.GENTILEZA_LEAF;
    else if (ratio > 0.25) color = COLORS.GENTILEZA_YELLOW;
    else color = COLORS.MOWER_ORANGE;
    this.fuelBarFill.setFillStyle(color);

    this.fuelLabel.setText(`COMBUSTIVEL ${Math.round(this.fuel)}/${FUEL_MAX}`);
  }

  private scheduleFuelSpawn(): void {
    const ms = FUEL_SPAWN_MS[this.levelIndex] ?? 8000;
    this.fuelSpawnTimer = this.time.delayedCall(ms, this.spawnFuelBarrel, [], this);
  }

  private spawnFuelBarrel(): void {
    if (this.gameOver || this.levelCleared) return;
    if (this.fuelBarrel) return;

    const candidates: { x: number; y: number }[] = [];
    for (let y = 0; y < this.level.altura_tiles; y++) {
      for (let x = 0; x < this.level.largura_efetiva_tiles; x++) {
        if (this.level.tiles[y][x] !== TILE.TALL) continue;
        if (x === this.playerTileX && y === this.playerTileY) continue;
        candidates.push({ x, y });
      }
    }

    if (candidates.length === 0) {
      // Sem grama alta sobrando — reagenda pra mais tarde
      this.scheduleFuelSpawn();
      return;
    }

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const sprite = this.add.rectangle(
      this.tileToPx(pick.x),
      this.tileToPy(pick.y),
      TILE_SIZE * 0.65,
      TILE_SIZE * 0.65,
      COLORS.MOWER_ORANGE
    );
    sprite.setStrokeStyle(4, 0xFFFFFF);
    sprite.setDepth(5);

    const tween = this.tweens.add({
      targets: sprite,
      scale: 1.15,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    this.fuelBarrel = { tileX: pick.x, tileY: pick.y, sprite, tween };
  }

  private onPickupFuel(): void {
    if (!this.fuelBarrel) return;
    this.fuel = FUEL_MAX;
    this.updateFuelBar();
    this.fuelBarrel.tween.stop();
    this.fuelBarrel.sprite.destroy();
    this.fuelBarrel = undefined;
    this.scheduleFuelSpawn();
  }

  private clearFuelBarrel(): void {
    if (!this.fuelBarrel) return;
    this.fuelBarrel.tween.stop();
    this.fuelBarrel.sprite.destroy();
    this.fuelBarrel = undefined;
  }

  private onLevelClear(): void {
    this.levelCleared = true;
    this.dir = 'NONE';
    this.pendingDir = 'NONE';
    this.fuelSpawnTimer?.remove();
    this.clearFuelBarrel();
    const isLast = this.levelIndex >= this.allLevels.length - 1;
    const msg = isLast
      ? 'PARABENS! TODAS AS FASES CONCLUIDAS\n\nToque ou aperte ESPACO pra voltar ao titulo'
      : `FASE ${this.level.id} COMPLETA!\n\nToque ou aperte ESPACO pra fase ${this.level.id + 1}`;
    this.centerMessage = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, msg, {
      fontFamily: 'Arial Black',
      fontSize: '48px',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 6,
      align: 'center',
      backgroundColor: 'rgba(0,0,0,0.75)',
      padding: { x: 40, y: 30 },
    });
    this.centerMessage.setOrigin(0.5);
    this.centerMessage.setScrollFactor(0);
    this.centerMessage.setDepth(2000);
  }

  private triggerGameOver(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.dir = 'NONE';
    this.pendingDir = 'NONE';
    this.fuelSpawnTimer?.remove();
    this.clearFuelBarrel();

    this.centerMessage = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      `SEM COMBUSTIVEL!\n\nFASE ${this.level.id}\n\nToque ou aperte ESPACO pra tentar de novo\n(ESC volta ao titulo)`,
      {
        fontFamily: 'Arial Black',
        fontSize: '44px',
        color: '#FF7043',
        stroke: '#000000',
        strokeThickness: 6,
        align: 'center',
        backgroundColor: 'rgba(0,0,0,0.85)',
        padding: { x: 40, y: 30 },
      }
    );
    this.centerMessage.setOrigin(0.5);
    this.centerMessage.setScrollFactor(0);
    this.centerMessage.setDepth(2000);
  }

  private advanceLevel(): void {
    if (this.levelIndex >= this.allLevels.length - 1) {
      this.scene.start('TitleScene');
    } else {
      this.scene.start('GameScene', { levelIndex: this.levelIndex + 1 });
    }
  }

  private restartLevel(): void {
    this.scene.restart({ levelIndex: this.levelIndex });
  }
}
