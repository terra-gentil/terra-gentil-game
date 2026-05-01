import type { AllLevelsJson } from '../types/Level';
import { NICKNAME_REGEX, type ScoreCreate } from '../types/Ranking';

export interface RunStats {
  active: boolean;
  startTimeMs: number;
  cutsByLevel: number[];
  highestLevel: number;
  practiceMode: boolean;
}

const LEVELS_TOTAL = 10;
const NICKNAME_KEY = 'gentileza:nickname';

let current: RunStats = emptyStats();

function emptyStats(): RunStats {
  return {
    active: false,
    startTimeMs: 0,
    cutsByLevel: new Array<number>(LEVELS_TOTAL).fill(0),
    highestLevel: 0,
    practiceMode: false,
  };
}

export function startRun(opts: { practiceMode: boolean; startLevelIndex: number }): void {
  current = {
    active: true,
    startTimeMs: Date.now(),
    cutsByLevel: new Array<number>(LEVELS_TOTAL).fill(0),
    highestLevel: opts.startLevelIndex + 1,
    practiceMode: opts.practiceMode,
  };
}

export function enterLevel(levelIndex: number): void {
  if (!current.active) return;
  if (levelIndex < 0 || levelIndex >= LEVELS_TOTAL) return;
  // Reseta cuts da fase em cada entrada. Sem isso, retries acumulam e permitem
  // inflar total_pct ate 99 sem progredir alem da fase atual (exploit de ranking).
  current.cutsByLevel[levelIndex] = 0;
  const reached = levelIndex + 1;
  if (reached > current.highestLevel) current.highestLevel = reached;
}

export function recordCut(levelIndex: number): void {
  if (!current.active) return;
  if (levelIndex < 0 || levelIndex >= LEVELS_TOTAL) return;
  current.cutsByLevel[levelIndex] += 1;
}

export function endRun(): void {
  current.active = false;
}

export function getStats(): RunStats {
  return { ...current, cutsByLevel: [...current.cutsByLevel] };
}

export function isRankingEligible(): boolean {
  return current.active && !current.practiceMode;
}

export function buildSubmitPayload(nickname: string, allLevels: AllLevelsJson): ScoreCreate {
  const totalTarget = allLevels.reduce((s, l) => s + l.grama_alta_para_cortar, 0);
  const totalCuts = current.cutsByLevel.reduce((s, c) => s + c, 0);
  let pct = totalTarget > 0 ? Math.round((totalCuts / totalTarget) * 100) : 0;
  pct = Math.max(0, Math.min(100, pct));
  // Backend rejeita pct=100 se level<10. Clampa pra 99 nesse caso pra nao quebrar submit
  // de quem chegou perto mas nao zerou.
  if (current.highestLevel < 10 && pct >= 100) pct = 99;

  const elapsedSec = Math.floor((Date.now() - current.startTimeMs) / 1000);
  // Backend exige time_seconds >= level_reached * 3 e <= 36000. Garantimos os limites.
  const minTime = Math.max(1, current.highestLevel * 3);
  const seconds = Math.max(minTime, Math.min(36000, elapsedSec));

  return {
    nickname,
    level_reached: current.highestLevel,
    total_pct: pct,
    time_seconds: seconds,
  };
}

export function loadCachedNickname(): string {
  try {
    return localStorage.getItem(NICKNAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveCachedNickname(nickname: string): void {
  try {
    localStorage.setItem(NICKNAME_KEY, nickname);
  } catch { /* ignore */ }
}

// Le ?nickname= da URL (ex: WebView do app passando o user logado).
// Se valido, sobrescreve o cache local pra que o modal pre-preencha com ele.
export function adoptNicknameFromUrl(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('nickname');
    if (!raw) return;
    const candidate = raw.toUpperCase();
    if (NICKNAME_REGEX.test(candidate)) {
      saveCachedNickname(candidate);
    }
  } catch { /* ignore */ }
}
