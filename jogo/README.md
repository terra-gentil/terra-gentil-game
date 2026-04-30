# Gentileza: Resgate dos Jardins

Jogo web do mascote Gentileza, do app Terra Gentil. Inspirado no Lawn Mower NES (Shiru, 2011).

## Stack

- Phaser 3
- TypeScript
- Vite
- Deploy: GitHub Pages
- Backend ranking: FastAPI no Railway

## Rodar localmente

```bash
npm install
npm run dev
```

Abre `http://localhost:5173` no celular ou desktop.

## Build

```bash
npm run build
```

Saída em `dist/`.

## Estrutura

- `src/scenes/` - cenas do Phaser (Boot, Title, Game)
- `src/config/` - configuração do jogo e constantes
- `public/assets/` - sprites, audio, mapas

## Marca

Gentileza é marca registrada nas classes 28 e 41 do INPI.
Inspirado em Lawn Mower NES (Shiru, 2011), reimplementado do zero.

## Status

Em desenvolvimento. Sprint atual: G0 (engenharia reversa concluída, scaffolding inicial).
