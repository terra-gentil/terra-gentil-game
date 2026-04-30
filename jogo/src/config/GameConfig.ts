import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { TitleScene } from '../scenes/TitleScene';
import { GameScene } from '../scenes/GameScene';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const TILE_SIZE = 64;

export const COLORS = {
  GRASS_TALL: 0x1B5E20,
  GRASS_CUT: 0x66BB6A,
  GENTILEZA_YELLOW: 0xF5C97E,
  GENTILEZA_LEAF: 0x4FBA53,
  MOWER_ORANGE: 0xE8631E,
  HUD_BLUE: 0x3A7BD5,
  WHITE: 0xFFFFFF,
  BLACK: 0x000000,
};

export const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1B5E20',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, TitleScene, GameScene],
  pixelArt: true,
  roundPixels: true,
  input: {
    activePointers: 3,
  },
};
