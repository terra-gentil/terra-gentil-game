export interface Settings {
  eyeStrainMode: boolean;
}

const STORAGE_KEY = 'gentileza:settings';

const DEFAULT_SETTINGS: Settings = {
  eyeStrainMode: false,
};

export function getSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // localStorage indisponivel (private mode em alguns browsers): silenciosamente continua
  }
}

export function toggleEyeStrainMode(): Settings {
  const current = getSettings();
  const updated = { ...current, eyeStrainMode: !current.eyeStrainMode };
  saveSettings(updated);
  return updated;
}
