import Phaser from 'phaser';
import { config } from './config/GameConfig';
import { adoptNicknameFromUrl } from './state/RunStats';

adoptNicknameFromUrl();

new Phaser.Game(config);

console.log('Gentileza: Resgate dos Jardins - inicializado');
