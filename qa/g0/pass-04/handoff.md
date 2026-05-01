# Handoff G0 pass-04

---

## Para reverificacao desta sprint (G0 pass-05+)

### Validado nesta rodada (analise estatica)

- [x] Scripts python (`extract_chr.py`, `extract_palette.py`, `extract_levels.py`) corretos e idempotentes
- [x] `niveis.json` casa 1:1 com `LevelJson` em `jogo/src/types/Level.ts`
- [x] LICENSE MIT + atribuicao Shiru valida e correta
- [x] Scaffolding Phaser 3 preservado (nao Phaser 4) - `package.json` ainda fixa `phaser@^3.80.0`
- [x] `pesquisa/` inalterada desde commit `49db09a`

### Gaps abertos (pass-05+)

- [ ] Hexdump bruto de `patterns.chr` offset 4096 nao verificado
- [ ] `bgm_*.asm` / `done.rle` / `title.rle` / `title.asm` nao inspecionados
- [ ] Build TypeScript nao executado nesta rodada (sandbox bloqueou shell)

---

## Para QA das proximas sprints (G9+)

### Invariantes de G0 que nao podem ser quebrados

#### Schema autoritativo

- `pesquisa/analise/assets-extraidos/fases_editor.json` e a fonte autoritativa dos 10 niveis. Qualquer geracao runtime DEVE casar com este formato.
- `jogo/public/assets/maps/niveis.json` e copia direta de `fases_editor.json`. Se algum dia regenerar via script, garantir paridade.
- TILE codes 0..3 (CUT, TALL, FLOWERS, STONE) DEVEM continuar batendo com `tiles_legenda` do JSON e `TILE` const em `Level.ts`.

#### Atribuicao e licenca

- MIT + atribuicao Shiru DEVE permanecer no LICENSE.
- Codigo do jogo NAO copia bits ASM do original - so engenharia reversa documentada.

#### Trade-offs documentados

- FLOWERS one-shot (vira CUT, sem re-penalty) - desvio aceito do NES original
- STONE re-penalty repetida - fiel ao NES original
- `fuel_inc_por_tile_8_8` campo dead no JSON - mantido pra uso futuro
- `playable_tiles_total` e `tiles_legenda` no JSON - sem uso runtime, mantidos pra documentacao

### Sinais de regressao a monitorar em G9+

1. **Se G9 substituir tilemap real**: TILE codes precisam continuar 0..3. Mudancas em `TILE.*` quebram contagem em `cutTileAt`.
2. **Se G9 mudar formato de niveis**: atualizar `LevelJson`, `niveis.json` e `fases_editor.json` em sincronia. Adicionar migracao se preciso.
3. **Se G10 adicionar 11+ niveis**: revisar dead fields (`fuel_inc_por_tile_8_8`) - decidir se ativam.
4. **Se README virar landing publica**: garantir que checklist de sprints reflete HEAD, nao pre-G7.

### Bugs abertos desta sprint

| ID | Sprint | Severidade | Status |
|---|---|---|---|
| P2-G0-01 | G0 | P2 | ABERTO - README.md:38-40 desatualizado |
| P3-G0-01 | G0 | P3 | ABERTO - tabela Spawn na ANALISE sem rotulo de coords |
| P3-G0-02 | G0 | P3 | ABERTO - schema LevelData proposto diverge do real |

### Bugs herdados ainda abertos

| ID | Sprint | Severidade | Status |
|---|---|---|---|
| P3-pass03-01 | G0 | P3 | ABERTO - hexdump bruto patterns.chr offset 4096 |
| P3-pass03-02 | G0 | P3 | ABERTO - asm/rle files nao inspecionados |
| P3-pass03-03 | G0 | P3 | ABERTO (cosmetico) - imprecisao "editor_y varia" |
