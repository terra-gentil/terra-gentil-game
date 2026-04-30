import { RANKING_API_URL } from '../config/Constants';
import type { ScoreCreate, ScoreOut, TopResponse } from '../types/Ranking';

export class RankingApiError extends Error {
  constructor(public kind: 'network' | 'rate_limit' | 'validation' | 'server', message: string) {
    super(message);
    this.name = 'RankingApiError';
  }
}

async function parseError(res: Response): Promise<RankingApiError> {
  if (res.status === 429) return new RankingApiError('rate_limit', 'Muitas tentativas. Aguarda um minuto.');
  if (res.status === 422) {
    let detail = 'Dados invalidos';
    try {
      const body = await res.json() as { detail?: string | unknown };
      if (typeof body.detail === 'string') detail = body.detail;
    } catch { /* ignore */ }
    return new RankingApiError('validation', detail);
  }
  return new RankingApiError('server', `Erro do servidor (${res.status})`);
}

export async function submitScore(payload: ScoreCreate): Promise<ScoreOut> {
  let res: Response;
  try {
    res = await fetch(`${RANKING_API_URL}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    throw new RankingApiError('network', 'Sem conexao com o servidor');
  }
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<ScoreOut>;
}

export async function getTopScores(limit = 50): Promise<TopResponse> {
  let res: Response;
  try {
    res = await fetch(`${RANKING_API_URL}/scores/top?limit=${limit}`);
  } catch (e) {
    throw new RankingApiError('network', 'Sem conexao com o servidor');
  }
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<TopResponse>;
}
