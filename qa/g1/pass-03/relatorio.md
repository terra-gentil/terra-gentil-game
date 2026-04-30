# QA G1 - Pass 03 - Relatorio

**Sprint:** G1
**Pass:** 03
**Data:** 2026-04-30
**Reviewer:** Sub-agente Sonnet G1 pass-03
**HEAD revisado:** `aa2633a` (G6)
**Commits desta janela:** `a67a26b` (qa-fixes round-2) e `aa2633a` (G6)

---

## 1. Verificacao dos fixes da pass-02

### G1-P2-01 ABERTO: COMO_RODAR.md com caminhos absolutos

**Status: CORRIGIDO** em `a67a26b`.

Leitura direta do arquivo confirmou: nenhuma ocorrencia de `C:\Gitlab_hz`, `C:\Users`, `Gitlab_hz`, ou caminhos Windows absolutos. O arquivo agora usa `cd jogo` relativo ao root do repo, com nota explicativa na linha 3-4. Suporte a Linux/Mac adicionado na deteccao de IP (linha 17: `ip addr`).

Grep por `C:\\|C:/|Gitlab_hz|eng\.` retornou zero resultados em COMO_RODAR.md.

### G1-P3-01 ABERTO: jogo/README.md "Sprint atual: G0"

**Status: CORRIGIDO** em `a67a26b`.

`jogo/README.md` agora aponta para o README raiz para status detalhado (linha final: "Em desenvolvimento. Status detalhado no README.md da raiz do repo."). A linha "Sprint atual: G0" foi removida.

### G1-P3-02 ABERTO: jogo/README.md sem base path do Pages

**Status: CORRIGIDO** em `a67a26b`.

Linha 7 agora documenta explicitamente: `Deploy: GitHub Pages (base: '/terra-gentil-game/' em build, './' em dev)`.

---

## 2. Verificacao do workflow — invariantes G1

### 2.1 Triggers

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'jogo/**'
      - '.github/workflows/deploy.yml'
  workflow_dispatch:
```

**OK.** Nenhum `pull_request_target`. Paths filter intacto. `workflow_dispatch` presente (para re-runs manuais, aceitavel).

### 2.2 Permissoes

Top-level: `contents: read` (apenas).
Job `deploy`: `pages: write` + `id-token: write`.
Job `build`: sem permissoes adicionais (herda apenas `contents: read`).

**OK.** Estrutura de permissoes minimas preservada. Nenhuma escalada.

### 2.3 Actions usadas

```
actions/checkout@v4
actions/setup-node@v4
actions/upload-pages-artifact@v3
actions/deploy-pages@v4
```

**OK.** Todas no namespace `actions/`. Nenhuma action de terceiro adicionada. SHA pin ausente (tradeoff aceito desde pass-01 para actions oficiais — nao regrediu).

### 2.4 npm ci vs npm install

`run: npm ci` confirmado no step Install.

**OK.**

### 2.5 Base path Vite

`vite.config.ts` linha 6: `base: command === 'build' ? '/terra-gentil-game/' : './'`

**OK.** Condicional intacto.

### 2.6 FORCE_JAVASCRIPT_ACTIONS_TO_NODE24

`env: FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` presente.

**OK.** Ainda necessario ate junho/2026.

### 2.7 package.json

`private: true` confirmado. Dependencias: TypeScript ~6.0.2, Vite ^8.0.10, Phaser ^3.90.0, @types/node ^25.6.0. Sem novas dependencias desde pass-02.

**Nota:** G6 adicionou `jogo/src/audio/SfxPlayer.ts` com Web Audio API pura (sem nova dependencia npm). Isso e correto — nao impacta lockfile nem `npm ci`.

---

## 3. Bundle size — trend G1->G6

| Sprint | Tamanho gzip (reportado) | Delta |
|--------|--------------------------|-------|
| G1 (baseline) | ~321 KB | — |
| G5 (pass-02) | ~324 KB | +3 KB |
| G6 (pass-03) | ~326 KB | +2 KB |

Conforme commit message do G6: "Bundle: 322 -> 326 KB gzip (+4 KB pelo SfxPlayer e wiring)".

**Avaliacao: TREND OK.** SfxPlayer usa Web Audio API nativa (zero deps npm), entao o crescimento de +4 KB e apenas o codigo do SfxPlayer.ts (120 linhas) + wiring em GameScene/TitleScene/Settings. Phaser continua dominando o bundle. Nenhuma nova dependencia npm importada.

**Monitorar em G7+:** Se backend (FastAPI Railway) adicionar um cliente HTTP JS, isso pode aumentar o bundle. Verificar se ha tree-shaking adequado ao adicionar libs.

---

## 4. Novos arquivos em G6 — varredura de info indesejada

### Arquivos novos em aa2633a

| Arquivo | Tipo | Verificacao |
|---------|------|-------------|
| `jogo/src/audio/SfxPlayer.ts` | TypeScript, 120 linhas | Lido integralmente |

### Arquivos modificados em aa2633a

| Arquivo | Verificacao |
|---------|-------------|
| `README.md` (raiz) | G6 marcado como concluido no checklist |
| `jogo/src/config/Settings.ts` | Campo `soundEnabled` adicionado |
| `jogo/src/scenes/GameScene.ts` | SFX calls adicionados |
| `jogo/src/scenes/TitleScene.ts` | Botao SOM adicionado |

### Resultado da varredura

Grep por `email|secret|password|api_key|gmail|token|C:\\|eng\.` em todo `jogo/src/` retornou **zero resultados**.

**SfxPlayer.ts** (arquivo novo de maior interesse):
- Sem imports externos. Usa apenas `window.AudioContext` e `window.webkitAudioContext` (APIs nativas do browser).
- Pattern para `webkitAudioContext` usa cast TypeScript `(window as unknown as {...})` — tecnica padrao para compatibilidade Safari antiga. Sem exposicao de dados.
- Singleton exportado como `sfx` — sem dados persistidos, sem chamadas a backend.
- Nenhum email, secret, caminho absoluto, ou dado pessoal.

**Settings.ts** (modificado):
- Novo campo `soundEnabled: boolean` com default `true`.
- Chave localStorage: `gentileza:settings` — ja existia, sem mudanca de escopo.
- `toggleSound()` adicionado — sem efeito colateral externo.

**TitleScene.ts** (modificado):
- Layout reorganizado, botao SOM adicionado. `console.log('TitleScene: inicializada')` presente — low-severity, sem dados sensiveis.

**GameScene.ts** (modificado):
- Chamadas de `sfx.*()` adicionadas em pontos de evento de jogo. Sem nova persistencia ou chamada externa.

---

## 5. Achados e classificacao

| ID | Severidade | Descricao | Status |
|----|-----------|-----------|--------|
| G1-P3-03 | INFO | `console.log('TitleScene: inicializada')` permanece no codigo de producao | ABERTO (tradeoff aceitavel — sem dados sensiveis, ja presente antes do G6) |
| G1-P3-04 | INFO | `sourcemap: true` em vite.config.ts — source maps ficam em `jogo/dist/` (nao commitado) | MONITORAR — ver nota abaixo |
| G1-P1-02 | TRADEOFF | Actions `@v4`/`@v3` sem SHA pin | Mantido desde pass-01 |
| G1-FJ-01 | INFO | `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` a remover apos junho/2026 | Pendente (esperado) |

**Nota sobre G1-P3-04 (sourcemap):** `sourcemap: true` gera `.map` files em `dist/`. `dist/` nao e commitado (`.gitignore` confirmado). O sourcemap nao expoe dados sensiveis hoje (codigo client-side puro, sem segredos hardcoded). Se G7+ adicionar chaves de API hardcoded no client, isso se torna P1. Monitorar.

---

## 6. Regressoes — nenhuma detectada

Todos os contratos invariantes G1 verificados em aa2633a:

| Contrato | Status em aa2633a |
|----------|-------------------|
| Workflow dispara em push/main paths jogo/** ou deploy.yml | OK |
| Top-level permissions: apenas `contents: read` | OK |
| `pages: write` e `id-token: write` apenas no job deploy | OK |
| Base path prod: `/terra-gentil-game/` | OK |
| Base path dev: `./` | OK |
| `npm ci` no workflow | OK |
| `private: true` em package.json | OK |
| Sem `pull_request_target` | OK |
| `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` | OK |
| Apenas actions/* no workflow | OK |
| Sem secrets/emails nos arquivos TypeScript | OK |
| `dist/` nao commitado | OK |

---

## 7. Sumario executivo

Pass-03 sem achados bloqueantes. Os 3 itens abertos da pass-02 (COMO_RODAR.md, jogo/README.md x2) foram todos corrigidos em `a67a26b`. O commit G6 (`aa2633a`) adicionou um arquivo novo (`SfxPlayer.ts`), sem nova dependencia npm, sem exposicao de dados, com bundle crescendo apenas +4 KB (trend saudavel). Todos os invariantes de seguranca e deploy do G1 estao intactos.
