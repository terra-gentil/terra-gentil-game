# Gentileza: Resgate dos Jardins

Jogo web do mascote Gentileza, do app Terra Gentil. Inspirado no Lawn Mower NES (Shiru, 2011).

## Stack

- Phaser 3.90
- TypeScript
- Vite
- Deploy: GitHub Pages (`base: '/terra-gentil-game/'` em build, `'./'` em dev)
- Backend ranking (futuro): FastAPI no Railway

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

Saida em `dist/`.

## Estrutura

- `src/scenes/` - cenas do Phaser (Boot, Title, Game)
- `src/config/` - configuracao + Settings (localStorage)
- `src/types/` - tipos compartilhados (Level)
- `public/assets/` - sprites, audio, mapas

## Marca

Gentileza e marca registrada nas classes 28 e 41 do INPI.
Inspirado em Lawn Mower NES (Shiru, 2011), reimplementado do zero.

## Status

Em desenvolvimento. Status detalhado no `README.md` da raiz do repo.
