# QA G0 pass-04 - Relatorio de Revisao

**Sprint**: G0 - Engenharia reversa do Lawn Mower NES + scaffolding Phaser 3
**Data**: 2026-04-30
**Reviewer**: Sub-agente Sonnet G0 pass-04
**HEAD analisado**: ad71970
**Commits revisados**: 2dfab0d (G0 base), 18d8f27 (LICENSE), 49db09a (qa-fixes G0)
**Build validado**: nao (analise estatica, sandbox bloqueou shell)

---

## Cobertura

| Area | Metodo |
|---|---|
| Scripts python (extract_chr/palette/levels.py) | Leitura completa |
| ANALISE_LAWN_MOWER.md vs codigo atual | Comparacao secao a secao |
| LICENSE MIT + atribuicao Shiru | Releitura |
| Schema niveis.json vs LevelJson em HEAD G8 | Diff de tipos |
| Scaffolding Phaser 3 (nao 4) | Releitura package.json + main.ts |
| Trade-offs novos | Cross-check com HANDOFF |

---

## Achados

### P2-G0-01 - README.md desatualizado: G7/G7.5/G8 ainda marcadas como pendentes

**Arquivo**: README.md:38-40

HEAD ad71970 + HANDOFF.md confirmam que G7, G7.5 e G8 estao concluidas (deploy backend Railway validado, frontend ranking integrado, WebView no app). Cartao de visita publico do repo esta desatualizado.

**Severidade**: P2 - documental publico. Sem impacto runtime.

**Correcao**: marcar [x] em G7, G7.5, G8 e adicionar entrada em git log section do README.

### P3-G0-01 - ANALISE_LAWN_MOWER.md tabela Spawn nao rotula game_x/y vs editor_x/y

**Arquivo**: pesquisa/analise/ANALISE_LAWN_MOWER.md:122-133

A tabela mostra coords sem indicar se sao `(game_x, game_y)` ou `(editor_x, editor_y)`. Risco: leitor copia `(7, 8)` direto e produz spawn off-by-(1,3) no port (que usa editor coords pra evitar offsets das bordas NES).

**Severidade**: P3 - documental.

### P3-G0-02 - Schema LevelData proposto na ANALISE diverge do LevelJson real

**Arquivo**: pesquisa/analise/ANALISE_LAWN_MOWER.md:190-205

A analise propoe schema enxuto `LevelData`, mas `jogo/src/types/Level.ts` mantem nomes PT-BR do extractor (largura_efetiva_tiles, altura_tiles, grama_alta_para_cortar). Divergencia intencional pra preservar trail de auditoria, mas nao anotada.

**Severidade**: P3 - documental.

---

## Verificacoes positivas

- `extract_chr.py` / `extract_palette.py` / `extract_levels.py`: corretos e idempotentes
- LICENSE com atribuicao MIT + Shiru valida e bem documentada
- Schema `niveis.json` casa 1:1 com `LevelJson` e consumers (GameScene, RunStats, SubmitModal)
- Scaffolding Phaser 3 (nao 4) preservado em HEAD apos 8+ sprints
- `pesquisa/` inalterada desde `49db09a`

---

## Itens herdados ainda abertos (P3)

- Hexdump bruto de `patterns.chr` offset 4096 nao verificado (pass-03)
- `bgm_*.asm` / `done.rle` / `title.rle` / `title.asm` nao inspecionados (pass-03)
- Imprecisao do handoff pass-03 sobre "editor_y varia" - todos os 10 niveis tem `editor_y=5` (aceito como nota cosmetica)

---

## Resumo

| Severidade | Total | Novos | Herdados |
|---|---|---|---|
| P0 | 0 | 0 | 0 |
| P1 | 0 | 0 | 0 |
| P2 | 1 | 1 | 0 |
| P3 | 5 | 2 | 3 |
