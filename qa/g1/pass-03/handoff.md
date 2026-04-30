# QA G1 - Pass 03 - Handoff

**Sprint:** G1
**Pass:** 03
**Data:** 2026-04-30
**Reviewer:** Sub-agente Sonnet G1 pass-03
**HEAD revisado:** `aa2633a` (G6)

---

## 1. Para reverificacao desta sprint (pass-04 em diante)

### O que foi coberto nesta rodada

- `.github/workflows/deploy.yml` lido diretamente do filesystem — estrutura completa, permissoes, triggers, actions.
- `jogo/vite.config.ts` lido — base path condicional confirmado intacto.
- `jogo/package.json` lido — sem novas dependencias em G6; `private: true` OK.
- `COMO_RODAR.md` lido — caminhos absolutos corrigidos, confirmado limpo.
- `jogo/README.md` lido — atualizado com stack Phaser 3.90, base path do Pages, link ao README raiz.
- `README.md` (raiz) lido — G6 marcado como concluido no checklist.
- `jogo/src/audio/SfxPlayer.ts` lido integralmente — arquivo novo do G6.
- `jogo/src/config/Settings.ts` lido — campo `soundEnabled` adicionado.
- `jogo/src/scenes/TitleScene.ts` lido — botao SOM adicionado.
- `jogo/src/scenes/GameScene.ts` lido integralmente — SFX calls adicionados.
- Grep por secrets/emails/caminhos absolutos em `jogo/src/` — zero resultados.
- Verificacao de workflow: triggers, permissoes, actions uses, npm ci.
- Verificacao de bundle size trend: 321->324->326 KB (saudavel).

### O que NAO foi validado e precisa de validacao futura

| Item | Por que nao validado | Como validar |
|------|---------------------|--------------|
| Deploy funcionando em prod | Sem acesso ao GitHub Actions UI | `https://github.com/terra-gentil/terra-gentil-game/actions` — verificar run verde |
| GitHub Pages habilitado com source "GitHub Actions" | Settings nao acessivel localmente | `https://github.com/terra-gentil/terra-gentil-game/settings/pages` |
| URL publica funcionando | Nao acessivel sem browser | `https://terra-gentil.github.io/terra-gentil-game/` |
| AudioContext funcionando no browser | Requer browser com user gesture | Testar no Chrome/Safari apertando um botao antes de qualquer som |
| Web Audio em Safari iOS (webkitAudioContext) | Requer dispositivo real | Testar toggle SOM no iPhone — verificar que AudioContext resume apos suspend |
| Branch protection em main | GitHub API nao acessivel | Settings > Branches no GitHub UI |
| SHA dos commits das actions | Nao verificado via GitHub API | `gh api` para confirmar SHA atual de actions/checkout@v4 etc. |

### O que precisa ser checado a cada nova rodada de G1

1. **Permissoes do workflow continuam minimas?**
   - Ler `.github/workflows/deploy.yml` e verificar `permissions:` top-level e por job.
   - Esperado: `contents: read` no top-level, `pages: write` + `id-token: write` apenas no job `deploy`.

2. **Base path do vite.config.ts intacto?**
   - Ler `jogo/vite.config.ts` linha 6.
   - Esperado: `command === 'build' ? '/terra-gentil-game/' : './'`

3. **Nenhuma nova action de terceiro adicionada?**
   - Grep por `uses:` em `.github/workflows/deploy.yml` — confirmar que todas sao `actions/*`.

4. **Nenhuma nova dependencia npm introduzida sem justificativa?**
   - Ler `jogo/package.json` e comparar com pass anterior.
   - G7 provavelmente adiciona dependencias de cliente HTTP — verificar se ha bundle impact.

5. **Bundle size trend saudavel?**
   - Comparar com baseline 321 KB (G1) e historico: G5=324 KB, G6=326 KB.
   - Salto > 20 KB em uma sprint e sinal de alerta (nova dep pesada sem tree-shaking).

---

## 2. Para o QA da proxima sprint

### Contratos estabelecidos pela G1 (invariantes a preservar)

Todos os contratos listados no handoff da pass-02 continuam validos e confirmados no HEAD aa2633a:

| Contrato | Onde esta definido | Status em aa2633a |
|----------|-------------------|-------------------|
| Workflow dispara em push/main com paths `jogo/**` ou `deploy.yml` | `deploy.yml:4-9` | OK |
| Top-level permissions: apenas `contents: read` | `deploy.yml:13-14` | OK |
| `pages: write` e `id-token: write` apenas no job `deploy` | `deploy.yml:55-57` | OK |
| Base path prod: `/terra-gentil-game/` | `vite.config.ts:6` | OK |
| Base path dev: `./` | `vite.config.ts:6` | OK |
| `npm ci` no workflow (nao `npm install`) | `deploy.yml` step Install | OK |
| `private: true` em package.json | `package.json:3` | OK |
| Sem `pull_request_target` no trigger | `deploy.yml` | OK |
| `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` | `deploy.yml` env | OK |
| Apenas actions do namespace `actions/*` | `deploy.yml` uses | OK |
| Sem secrets/caminhos absolutos em `jogo/src/` | Grep confirmado | OK |
| `dist/` nao commitado | `.gitignore` | OK |

### Itens abertos que passam para pass-04 (se houver)

1. **G1-P3-03 INFO:** `console.log('TitleScene: inicializada')` em TitleScene.ts linha final de `create()`. Sem dados sensiveis. Classificado como INFO/tradeoff — nao bloqueia, mas poderia ser removido antes do lancamento G10.

2. **G1-P3-04 INFO:** `sourcemap: true` em vite.config.ts — gera `.map` em `dist/` (nao commitado). Sem risco hoje (codigo client-side puro). Se G7+ adicionar chaves de API hardcoded no client-side, elevar para P1 e desabilitar sourcemaps em prod ou mover secrets para envvars de CI.

3. **G1-P1-02 TRADEOFF:** Actions em `@v4`/`@v3` sem SHA pin. Decisao mantida: aceitar para actions oficiais `actions/*` enquanto nao houver Dependabot configurado.

4. **G1-FJ-01 INFO:** `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` a remover apos junho/2026 quando GitHub forcar Node 24 globalmente. Nao bloqueia — remover na primeira sprint apos essa data.

### Sinais de regressao a monitorar em G7+

1. **Permissoes escaladas no job build:** Se alguem mover `pages: write` ou `id-token: write` para o top-level ou para o job `build`, P1 imediato.

2. **Action de terceiro sem SHA pin:** Se qualquer linha `uses:` nova nao for do namespace `actions/`, P1 imediato.

3. **`pull_request_target` adicionado:** Risco de fork injection. P1 imediato.

4. **`npm install` em vez de `npm ci` no workflow:** Quebra reproducibilidade do build.

5. **Base path hardcoded:** Se `vite.config.ts` mudar para `base: './'` fixo (sem condicional), o site em producao vai 404 todos os assets.

6. **Nova dependencia npm sem justificativa (G7+):** G7 provavelmente adiciona cliente HTTP para FastAPI Railway. Verificar se introduz bundle > 10 KB adicional e se ha tree-shaking.

7. **Secret hardcoded no client-side:** Se Railway deploy URL ou chave de API for escrita diretamente em TypeScript, isso vai para o bundle (e potencialmente para o sourcemap). Usar envvars de CI (`VITE_*`) e nunca colocar segredos no codigo.

8. **`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` expirado:** Apos junho/2026, o env var se torna obsoleto. Se esquecido, pode gerar warnings no CI. Remover proativamente.

### Contexto tecnico atualizado (HEAD aa2633a)

- **8 arquivos TypeScript** em `jogo/src/`: `main.ts`, `config/GameConfig.ts`, `config/Settings.ts`, `types/Level.ts`, `scenes/BootScene.ts`, `scenes/TitleScene.ts`, `scenes/GameScene.ts`, `audio/SfxPlayer.ts` (novo em G6).
- **Settings.ts** usa `localStorage` com chave `gentileza:settings`, agora com dois campos: `eyeStrainMode` e `soundEnabled`. Sem dados pessoais.
- **SfxPlayer.ts**: Web Audio API pura (sem dep npm), singleton `sfx`. AudioContext lazy (criado no primeiro `play()`) e resume automatico em mobile. `webkitAudioContext` suportado para Safari.
- **Bundle size:** ~326 KB gzip (G6). Phaser domina (~315+ KB). SfxPlayer adicionou +4 KB. Nenhuma nova dep npm.
- **Workflow**: Sem modificacoes desde `5bcf397` (qa-fixes aplicados antes de G4). Estrutura estavel.
- **Versoes de dependencias:** TypeScript ~6.0.2, Vite ^8.0.10, Phaser ^3.90.0, @types/node ^25.6.0.
- **Deploy:** OIDC via `id-token: write` + `actions/deploy-pages@v4` — sem PAT ou deploy key. Padrao mais seguro para Pages.
