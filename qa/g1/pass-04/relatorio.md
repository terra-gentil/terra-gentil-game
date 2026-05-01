# QA G1 pass-04 - Relatorio de Revisao

**Sprint**: G1 - Setup repo GitHub publico + deploy automatico via Actions
**Data**: 2026-04-30
**Reviewer**: Sub-agente Sonnet G1 pass-04
**HEAD analisado**: ad71970
**Commits revisados**: 5fc6645 (workflow + base path), c1c1e48 (opt-in Node 24)
**Build validado**: nao (analise estatica)

---

## Cobertura

| Area | Metodo |
|---|---|
| .github/workflows/deploy.yml (permissoes, concurrency, paths) | Leitura linha a linha |
| jogo/vite.config.ts (base path condicional) | Leitura completa |
| jogo/index.html (links assets, viewport) | Leitura completa |
| README.md / COMO_RODAR.md | Cross-check com HEAD |
| .gitignore raiz e backend/ | Leitura completa |
| jogo/package.json (scripts dev/build) | Leitura completa |
| Coexistencia com deploy backend Railway | Diff de paths |

---

## Achados

### P3-G1-05 - README.md desatualizado: G7/G7.5/G8 listadas como pendentes

**Arquivo**: README.md:27, 38, 39, 40

Linha 27 ainda diz "Backend ranking (futuro)". Linhas 38-40 listam G7/G7.5/G8 como `[ ]`. HEAD e HANDOFF confirmam concluidas. Sem impacto runtime, so doc publica.

**Severidade**: P3 - documental.

### P3-G1-06 - COMO_RODAR.md sem secao de backend

**Arquivo**: COMO_RODAR.md:46-70

Documenta dev/build do jogo mas nao cita `backend/`. Em HEAD existe `backend/` com FastAPI + tests + railway.toml + Dockerfile. Faltam instrucoes pra dev local de backend (uvicorn, env vars).

**Severidade**: P3 - doc gap.

### P3-G1-07 - Workflow deploy.yml sem comentario de dual-deploy

**Arquivo**: .github/workflows/deploy.yml:1

O workflow filtra apenas `jogo/**`. Backend deploya em paralelo via Railway (`backend/railway.toml`). Falta comentario inicial explicando o split (Pages pra frontend, Railway pra backend) pra novo dev nao se confundir.

**Severidade**: P3 - doc.

---

## Verificacoes positivas (todas OK)

- Permissoes minimas: top-level `contents: read`, `pages: write`+`id-token: write` so no job deploy
- Concurrency `group: pages, cancel-in-progress: true` presente
- Actions oficiais `actions/*` em `@v4`/`@v3` (trade-off aceito sem SHA pin)
- Path filter `paths: ['jogo/**', '.github/workflows/deploy.yml']` correto - backend separado nao re-dispara Pages
- `npm ci` (nao `npm install`) - lock determinista
- `pull_request_target` NAO usado (seguranca)
- `jogo/vite.config.ts:6` base path condicional intacto: `/terra-gentil-game/` em build, `'./'` em dev. Suporta 2 consumidores agora (Pages + WebView do app)
- `jogo/package.json` sem nova dep em G7/G7.5/G8 (fetch nativo). `private: true` mantido. Lockfile presente
- `.gitignore` raiz cobre `dist/`, `node_modules/`, `.env`, `pesquisa/lawn-mower-original/`. `backend/.gitignore` cobre `.venv/`, `*.db`, `__pycache__/`. Sem secret no repo
- `RANKING_API_URL` hardcoded em `Constants.ts:21` + `sourcemap: true` em `vite.config.ts:14`: zero risco hoje (URL publica), elevar pra P1 se algum dia algum token client-side for adicionado

---

## Itens herdados ainda abertos

- G1-P3-03: `console.log` em producao (aceito ate G10)
- G1-P3-04 / G1-P3-08: sourcemap + URL hardcoded (cosmetico)
- G1-P1-02: actions sem SHA pin (aceito enquanto nao houver Dependabot)
- G1-FJ-01: `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` removivel apos jun/2026

---

## Resumo

| Severidade | Total | Novos | Herdados |
|---|---|---|---|
| P0 | 0 | 0 | 0 |
| P1 | 0 | 0 | 0 |
| P2 | 0 | 0 | 0 |
| P3 | 7 | 3 | 4 |
