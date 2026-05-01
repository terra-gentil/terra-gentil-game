# Handoff G1 pass-04

---

## Para reverificacao desta sprint (G1 pass-05+)

### Validado nesta rodada

- [x] Workflow `.github/workflows/deploy.yml` permissoes minimas mantidas
- [x] Concurrency `group: pages, cancel-in-progress: true`
- [x] Actions oficiais `actions/*` em `@v4`/`@v3`
- [x] Path filter `paths: ['jogo/**', '.github/workflows/deploy.yml']` correto
- [x] `npm ci` em vez de `npm install`
- [x] Sem `pull_request_target`
- [x] `jogo/vite.config.ts:6` base path condicional intacto
- [x] `jogo/package.json` sem nova dep em G7/G7.5/G8 (fetch nativo)
- [x] `.gitignore` raiz e backend cobrem secrets/builds
- [x] Coexistencia com deploy backend Railway sem conflito

### Gaps abertos

- [ ] Build em CI ainda nao tem step de testes do jogo (vite check apenas)
- [ ] Backend tem `pytest` em workflow Railway separado, mas nao validado neste pass
- [ ] Validacao de cabecalhos de seguranca pos-Pages deploy (CSP, X-Frame-Options) nao auditada

---

## Para QA das proximas sprints (G9+)

### Invariantes do CI/build estabelecidos

#### Workflow `deploy.yml`

- Permissao top-level DEVE permanecer `contents: read`. Permissoes de escrita `pages: write` e `id-token: write` SO no job de deploy.
- Concurrency `group: pages, cancel-in-progress: true` impede deploys concorrentes.
- Path filter `paths: ['jogo/**', '.github/workflows/deploy.yml']` - se algum dia mover assets pra raiz, ajustar.
- Actions oficiais `actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`. Se SHA pin virar requirement (Dependabot ativo), atualizar com cuidado (G1-P1-02 aberto).

#### Vite config

- Base path condicional `mode === 'production' ? '/terra-gentil-game/' : './'` - DEVE manter pra dev local (LAN) + Pages + WebView do app (que aponta pra URL publica).
- `host: true` em `server.host` - acesso LAN em dev.
- `sourcemap: true` em build - ate G10 (revisar antes do lancamento).

#### `.gitignore`

- `pesquisa/lawn-mower-original/` continua gitignored (codigo do Shiru, fora do escopo do nosso repo).
- `backend/.env`, `backend/*.db` ignorados - nao versionar credentials nem DB.

### Sinais de regressao a monitorar em G9+

1. **Se G9 adicionar assets binarios grandes** (sprites, audio): conferir tamanho do bundle no Pages (limite 1GB total). Avaliar Git LFS se passar.
2. **Se G9 introduzir env vars Vite** (`VITE_*`): atualizar workflow pra passar via env do job.
3. **Se G10 adicionar testes E2E**: adicionar step `npm test` antes do build no workflow.
4. **Se a URL publica do backend mudar**: atualizar `Constants.ts:21` e (eventualmente) prever ENV var.
5. **Se o repo virar privado** (improvavel): rever permissoes de Pages e tokens.

### Bugs novos desta sprint

| ID | Sprint | Severidade | Status |
|---|---|---|---|
| G1-P3-05 | G1 | P3 | ABERTO - README.md desatualizado pos-G7/G8 |
| G1-P3-06 | G1 | P3 | ABERTO - COMO_RODAR.md sem secao backend |
| G1-P3-07 | G1 | P3 | ABERTO - workflow sem comentario dual-deploy |

### Bugs herdados ainda abertos

| ID | Sprint | Severidade | Status |
|---|---|---|---|
| G1-P3-03 | G1 | P3 | ABERTO - console.log em prod (aceito ate G10) |
| G1-P3-04 / G1-P3-08 | G1 | P3 | ABERTO - sourcemap + URL hardcoded |
| G1-P1-02 | G1 | P1 (downgrade) | ABERTO - actions sem SHA pin (aceito) |
| G1-FJ-01 | G1 | informativo | ABERTO - FORCE_JS_NODE24 removivel apos jun/2026 |
