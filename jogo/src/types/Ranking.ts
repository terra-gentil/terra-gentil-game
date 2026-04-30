export const NICKNAME_REGEX = /^[A-Z0-9_]{3,12}$/;

export interface ScoreCreate {
  nickname: string;
  level_reached: number;
  total_pct: number;
  time_seconds: number;
}

export interface ScoreOut {
  id: number;
  nickname: string;
  level_reached: number;
  total_pct: number;
  time_seconds: number;
  created_at: string;
}

export interface TopResponse {
  scores: ScoreOut[];
  count: number;
}
