# Terra Gentil Game - Gentileza: Resgate dos Jardins

Subprojeto 1.2 do app Terra Gentil. Jogo web pixel-art do mascote Gentileza.

Inspirado em **Lawn Mower NES** (Shiru, 2011, Dominio Publico).
Veja `LICENSE` e `pesquisa/analise/ANALISE_LAWN_MOWER.md` para creditos completos.

## Estrutura

- `pesquisa/` - engenharia reversa do Lawn Mower NES original (relatorios versionados, repo original gitignored)
- `jogo/` - codigo do jogo Phaser 3 + TypeScript (codigo novo, escrito do zero)

## Quick start

```bash
cd jogo
npm install
npm run dev
```

Veja `COMO_RODAR.md` pra detalhes.

## Stack

- Phaser 3.90 + TypeScript + Vite
- Deploy frontend: GitHub Pages
- Backend ranking (futuro): FastAPI no Railway

## Status

- [x] G0 - Engenharia reversa + scaffolding
- [x] G1 - Setup repo GitHub + GitHub Pages
- [x] G2 - Engine core (movimento, grid, corte)
- [x] G3 - Camera + carregamento de fases
- [x] G4 - Game loop completo (combustivel, penalty, galao, game over)
- [x] G5 - Mobile (D-pad touch, modo olhos cansados)
- [x] G6 - Audio (SFX sintetizado via Web Audio; OGG real fica pra G6.5 com FamiStudio)
- [ ] G7 - Backend ranking (FastAPI Railway)
- [ ] G7.5 - WebView no app Terra Gentil
- [ ] G8 - Frontend ranking
- [ ] G9 - Visual final (sprite Gentileza, tilemap)
- [ ] G10 - Lancamento

## QA

Cada sprint roda revisao de QA por sub-agentes. Relatorios em `qa/g{N}/pass-XX/`.
Veja `qa/README.md`.

## Marca

Gentileza e marca registrada da Terra Gentil nas classes 28 e 41 do INPI.

## Creditos

- **Lawn Mower NES** (2011) por **Shiru** (shiru@mail.ru) - inspiracao do gameplay, codigo original em Dominio Publico em https://github.com/sehugg/lawn-mower-nes
- **Phaser 3** por Photon Storm Ltd, MIT License
- **Terra Gentil** - marca, conceito do mascote Gentileza, brief do jogo

## Licenca

MIT (ver `LICENSE`).
