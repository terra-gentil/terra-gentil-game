import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE, COLORS } from '../config/Constants';
import { TILE, type AllLevelsJson, type LevelJson } from '../types/Level';
import { getSettings, type Settings } from '../config/Settings';
import { sfx } from '../audio/SfxPlayer';
import { enterLevel, recordCut, isRankingEligible, endRun } from '../state/RunStats';
import { showSubmitModal } from '../ui/SubmitModal';

type Dir = 'NONE' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';

const DIR_VEC: Record<Dir, { x: number; y: number }> = {
  NONE: { x: 0, y: 0 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
};

const TILE_TEXTURE: Record<number, string> = {
  [TILE.CUT]: 'tile_cut',
  [TILE.TALL]: 'tile_tall',
  [TILE.FLOWERS]: 'tile_flowers',
  [TILE.STONE]: 'tile_stone',
};

const HUD_HEIGHT = 100;

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
  sprite: Phaser.GameObjects.Image;
  tween: Phaser.Tweens.Tween;
}

// Visual scaling derivado das settings. Usado pra ajustar tamanho de fonte,
// player, D-pad etc. quando "modo olhos cansados" estiver ligado.
interface VisualScale {
  hudFont: string;
  hudStroke: number;
  fuelLabelFont: string;
  playerScale: number;
  playerStroke: number;
  centerFont: string;
  dpadButtonSize: number;
  dpadArm: number;
  dpadArrowFont: string;
  dpadStroke: number;
  dpadCenterX: number;
  dpadAlpha: number;
  bgColor: string;
}

function visualScaleFor(settings: Settings): VisualScale {
  if (settings.eyeStrainMode) {
    return {
      hudFont: '44px',
      hudStroke: 5,
      fuelLabelFont: '24px',
      playerScale: 1.2,
      playerStroke: 7,
      centerFont: '56px',
      dpadButtonSize: 90,
      dpadArm: 70,
      dpadArrowFont: '48px',
      dpadStroke: 4,
      dpadCenterX: 125,
      dpadAlpha: 0.22,
      bgColor: '#062007',
    };
  }
  return {
    hudFont: '32px',
    hudStroke: 4,
    fuelLabelFont: '20px',
    playerScale: 1.0,
    playerStroke: 4,
    centerFont: '48px',
    dpadButtonSize: 70,
    dpadArm: 55,
    dpadArrowFont: '36px',
    dpadStroke: 2,
    dpadCenterX: 105,
    dpadAlpha: 0.12,
    bgColor: '#0E3211',
  };
}

export class GameScene extends Phaser.Scene {
  private allLevels!: AllLevelsJson;
  private level!: LevelJson;
  private levelIndex = 0;
  private tileGrid: Phaser.GameObjects.Image[][] = [];

  private worldW = 0;
  private worldH = 0;
  private worldOffsetY = 0;

  private player!: Phaser.GameObjects.Sprite;
  private playerTileX = 0;
  private playerTileY = 0;
  private dir: Dir = 'NONE';
  private pendingDir: Dir = 'NONE';
  // Ultima direcao que o player olhou (pra escolher idle anim quando parado)
  private lastFacing: 'down' | 'up' | 'left' | 'right' = 'down';
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
  private advancing = false;
  private submitModalOpen = false;

  private vs!: VisualScale;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: SceneData): void {
    this.levelIndex = data.levelIndex ?? 0;
    this.dir = 'NONE';
    this.pendingDir = 'NONE';
    this.lastFacing = 'down';
    this.cutCount = 0;
    this.levelCleared = false;
    this.tileGrid = [];
    this.centerMessage = undefined;
    this.fuel = FUEL_MAX;
    this.fuelDecAccumMs = 0;
    this.fuelBarrel = undefined;
    this.fuelSpawnTimer = undefined;
    this.gameOver = false;
    this.advancing = false;
    this.submitModalOpen = false;
    const settings = getSettings();
    this.vs = visualScaleFor(settings);
    sfx.setMuted(!settings.soundEnabled);
  }

  create(): void {
    this.allLevels = this.cache.json.get('niveis') as AllLevelsJson;
    if (!this.allLevels || !this.allLevels[this.levelIndex]) {
      console.error('Nivel nao encontrado', this.levelIndex);
      this.scene.start('TitleScene');
      return;
    }

    this.level = JSON.parse(JSON.stringify(this.allLevels[this.levelIndex])) as LevelJson;

    enterLevel(this.levelIndex);

    this.cameras.main.setBackgroundColor(this.vs.bgColor);

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
        const tex = TILE_TEXTURE[type] ?? 'tile_cut';
        const img = this.add.image(this.tileToPx(col), this.tileToPy(row), tex);
        img.setDisplaySize(TILE_SIZE, TILE_SIZE);
        img.setData('type', type);
        this.tileGrid[row][col] = img;
      }
    }

    this.playerTileX = this.level.spawn_jogador.editor_x;
    this.playerTileY = this.level.spawn_jogador.editor_y;
    this.player = this.add.sprite(
      this.tileToPx(this.playerTileX),
      this.tileToPy(this.playerTileY),
      'gentileza',
      0
    );
    // Origin (0.5, 0.65) alinha pes ligeiramente abaixo do centro do tile
    // (cabeca/folhas ficam acima do tile, comportamento RPG classico).
    // O ponto (player.x, player.y) continua sendo o centro logico do tile.
    this.player.setOrigin(0.5, 0.65);
    this.player.setScale(this.vs.playerScale);
    this.player.setDepth(10);
    this.player.play('g-idle-down');

    this.cameras.main.startFollow(this.player, false, 0.1, 0);

    this.cursors = this.input.keyboard!.createCursorKeys();

    // Global pointer pra tap-to-move (fora do D-pad). currentlyOver tem
    // os GameObjects interativos sob o ponteiro — se houver, e clique no
    // D-pad e o handler do botao trata.
    const onPointerDown = (
      pointer: Phaser.Input.Pointer,
      currentlyOver: Phaser.GameObjects.GameObject[]
    ) => {
      if (this.advancing) return;
      if (this.submitModalOpen) return;
      if (currentlyOver.length > 0) return;
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
    };
    this.input.on('pointerdown', onPointerDown);

    const onConfirm = () => {
      if (this.advancing) return;
      if (this.submitModalOpen) return;
      if (this.levelCleared) this.advanceLevel();
      else if (this.gameOver) this.restartLevel();
    };
    const onEscape = () => {
      if (this.advancing) return;
      if (this.submitModalOpen) return;
      this.advancing = true;
      endRun();
      this.scene.start('TitleScene');
    };
    const kb = this.input.keyboard!;
    kb.on('keydown-SPACE', onConfirm);
    kb.on('keydown-ENTER', onConfirm);
    kb.on('keydown-ESC', onEscape);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown', onPointerDown);
      kb.off('keydown-SPACE', onConfirm);
      kb.off('keydown-ENTER', onConfirm);
      kb.off('keydown-ESC', onEscape);
      this.fuelSpawnTimer?.remove();
      this.clearFuelBarrel();
    });

    this.buildHud();
    this.updateHud();
    this.updateFuelBar();
    this.buildDPad();

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
      fontSize: this.vs.hudFont,
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: this.vs.hudStroke,
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
      fontSize: this.vs.fuelLabelFont,
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 3,
    });
    this.fuelLabel.setOrigin(0.5);
    this.fuelLabel.setScrollFactor(0).setDepth(1002);
  }

  private buildDPad(): void {
    const cx = this.vs.dpadCenterX;
    // Em modo olhos cansados, botoes maiores precisam de mais margem do bottom
    // pra nao bater no home indicator do iPhone (P1 do QA G5 pass-01).
    const cy = GAME_HEIGHT - (this.vs.dpadButtonSize / 2 + this.vs.dpadArm + 20);
    const arm = this.vs.dpadArm;
    const size = this.vs.dpadButtonSize;
    const buttons: Array<{ dir: Dir; offsetX: number; offsetY: number; arrow: string }> = [
      { dir: 'UP', offsetX: 0, offsetY: -arm, arrow: '▲' },
      { dir: 'DOWN', offsetX: 0, offsetY: arm, arrow: '▼' },
      { dir: 'LEFT', offsetX: -arm, offsetY: 0, arrow: '◀' },
      { dir: 'RIGHT', offsetX: arm, offsetY: 0, arrow: '▶' },
    ];

    for (const btn of buttons) {
      const bx = cx + btn.offsetX;
      const by = cy + btn.offsetY;

      const baseAlpha = this.vs.dpadAlpha;
      const hoverAlpha = Math.min(0.85, baseAlpha + 0.25);
      const rect = this.add.rectangle(bx, by, size, size, 0x000000, baseAlpha);
      rect.setStrokeStyle(this.vs.dpadStroke, 0xFFFFFF);
      rect.setScrollFactor(0).setDepth(2000);
      rect.setInteractive({ useHandCursor: true });

      const arrow = this.add.text(bx, by, btn.arrow, {
        fontFamily: 'Arial Black',
        fontSize: this.vs.dpadArrowFont,
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 4,
      });
      arrow.setOrigin(0.5).setScrollFactor(0).setDepth(2001);

      rect.on('pointerdown', () => {
        if (this.advancing) return;
        if (this.submitModalOpen) return;
        if (this.levelCleared) {
          this.advanceLevel();
          return;
        }
        if (this.gameOver) {
          this.restartLevel();
          return;
        }
        this.requestDir(btn.dir);
      });
      rect.on('pointerover', () => rect.setFillStyle(0x000000, hoverAlpha));
      rect.on('pointerout', () => rect.setFillStyle(0x000000, baseAlpha));
    }
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
      this.updateFacing();
    }
  }

  // Atualiza lastFacing baseado em dir atual e toca a anim correspondente.
  // Walking quando dir != NONE, idle (frame fixo) quando dir == NONE.
  private updateFacing(): void {
    if (this.dir === 'LEFT') this.lastFacing = 'left';
    else if (this.dir === 'RIGHT') this.lastFacing = 'right';
    else if (this.dir === 'UP') this.lastFacing = 'up';
    else if (this.dir === 'DOWN') this.lastFacing = 'down';
    const animKey = this.dir === 'NONE'
      ? `g-idle-${this.lastFacing}`
      : `g-walk-${this.lastFacing}`;
    if (this.player.anims.currentAnim?.key !== animKey) {
      this.player.play(animKey);
    }
  }

  update(_time: number, delta: number): void {
    if (this.levelCleared || this.gameOver) return;
    const cappedDelta = Math.min(delta, 50);
    const dt = cappedDelta / 1000;
    this.readInput();

    if (this.dir !== 'NONE') {
      this.fuelDecAccumMs += cappedDelta;
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
      this.updateFacing();
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
          this.updateFacing();
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
    if (this.fuelBarrel && this.fuelBarrel.tileX === tx && this.fuelBarrel.tileY === ty) {
      this.onPickupFuel();
      // NAO retorna — galao spawna em TALL, continua pra cortar a grama embaixo
    }

    const type = this.level.tiles[ty][tx];
    if (type === TILE.TALL) {
      this.cutTileAt(tx, ty);
      sfx.cut();
    } else if (type === TILE.FLOWERS) {
      this.applyFuelPenalty(PENALTY_FLOWERS);
      this.level.tiles[ty][tx] = TILE.CUT;
      this.tileGrid[ty][tx].setTexture('tile_cut');
      this.tileGrid[ty][tx].setData('type', TILE.CUT);
      // Se o penalty disparou game over, skip SFX pra nao sobrepor com gameOver()
      if (!this.gameOver) {
        sfx.penaltyFlowers();
      }
    } else if (type === TILE.STONE) {
      this.applyFuelPenalty(PENALTY_STONE);
      // Se o penalty disparou game over, skip shake+SFX pra nao sobrepor
      if (!this.gameOver) {
        this.cameras.main.shake(250, 0.008);
        sfx.penaltyStone();
      }
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
    this.tileGrid[ty][tx].setTexture('tile_cut');
    this.tileGrid[ty][tx].setData('type', TILE.CUT);
    this.cutCount++;
    recordCut(this.levelIndex);
    this.updateHud();
    if (this.cutCount >= this.level.grama_alta_para_cortar) {
      this.onLevelClear();
    }
  }

  private updateHud(): void {
    const target = this.level.grama_alta_para_cortar;
    const pct = Math.min(100, Math.round((this.cutCount / target) * 100));
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
      this.scheduleFuelSpawn();
      return;
    }

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const sprite = this.add.image(
      this.tileToPx(pick.x),
      this.tileToPy(pick.y),
      'fuel_barrel'
    );
    sprite.setDisplaySize(TILE_SIZE * 0.7, TILE_SIZE * 0.7);
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
    sfx.fuelPickup();
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
    sfx.levelClear();
    const isLast = this.levelIndex >= this.allLevels.length - 1;
    const msg = isLast
      ? 'PARABENS! TODAS AS FASES CONCLUIDAS\n\nToque ou aperte ESPACO pra voltar ao titulo'
      : `FASE ${this.level.id} COMPLETA!\n\nToque ou aperte ESPACO pra fase ${this.level.id + 1}`;
    this.centerMessage = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, msg, {
      fontFamily: 'Arial Black',
      fontSize: this.vs.centerFont,
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 6,
      align: 'center',
      backgroundColor: 'rgba(0,0,0,0.75)',
      padding: { x: 40, y: 30 },
    });
    this.centerMessage.setOrigin(0.5);
    this.centerMessage.setScrollFactor(0);
    // Depth 2002 fica acima do D-pad (rectangle 2000 + arrow text 2001)
    this.centerMessage.setDepth(2002);

    if (isLast && isRankingEligible()) {
      this.openSubmitModal('win');
    }
  }

  private triggerGameOver(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.dir = 'NONE';
    this.pendingDir = 'NONE';
    this.fuelSpawnTimer?.remove();
    this.clearFuelBarrel();
    sfx.gameOver();

    this.centerMessage = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      `SEM COMBUSTIVEL!\n\nFASE ${this.level.id}\n\nToque ou aperte ESPACO pra tentar de novo\n(ESC volta ao titulo)`,
      {
        fontFamily: 'Arial Black',
        fontSize: this.vs.centerFont,
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
    // Depth 2002 fica acima do D-pad (rectangle 2000 + arrow text 2001)
    this.centerMessage.setDepth(2002);

    if (isRankingEligible()) {
      this.openSubmitModal('gameOver');
    }
  }

  private openSubmitModal(reason: 'gameOver' | 'win'): void {
    this.submitModalOpen = true;
    showSubmitModal(this.allLevels, {
      onSubmitted: () => {
        this.submitModalOpen = false;
        endRun();
        this.advancing = true;
        this.scene.start('RankingScene');
      },
      onSkipped: () => {
        this.submitModalOpen = false;
        if (reason === 'win') {
          // Win pulou submit — run terminou
          endRun();
          this.advancing = true;
          this.scene.start('TitleScene');
          return;
        }
        // gameOver + pulou submit: deixa a run viva. Jogador pode dar restart
        // (Space/click) e seguir tentando, ou Esc volta pro Title (que ai sim
        // chama endRun via onEscape).
      },
    });
  }

  private advanceLevel(): void {
    if (this.advancing) return;
    this.advancing = true;
    if (this.levelIndex >= this.allLevels.length - 1) {
      this.scene.start('TitleScene');
    } else {
      this.scene.start('GameScene', { levelIndex: this.levelIndex + 1 });
    }
  }

  private restartLevel(): void {
    if (this.advancing) return;
    this.advancing = true;
    this.scene.restart({ levelIndex: this.levelIndex });
  }
}
