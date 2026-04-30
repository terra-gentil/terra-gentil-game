import { NICKNAME_REGEX } from '../types/Ranking';
import { submitScore, RankingApiError } from '../api/RankingApi';
import { buildSubmitPayload, getStats, loadCachedNickname, saveCachedNickname } from '../state/RunStats';
import type { AllLevelsJson } from '../types/Level';

export interface SubmitModalCallbacks {
  onSubmitted: () => void;
  onSkipped: () => void;
}

export function showSubmitModal(allLevels: AllLevelsJson, cb: SubmitModalCallbacks): void {
  const stats = getStats();
  const totalTarget = allLevels.reduce((s, l) => s + l.grama_alta_para_cortar, 0);
  const totalCuts = stats.cutsByLevel.reduce((s, c) => s + c, 0);
  const pct = totalTarget > 0 ? Math.round((totalCuts / totalTarget) * 100) : 0;
  const elapsedSec = Math.floor((Date.now() - stats.startTimeMs) / 1000);

  const overlay = document.createElement('div');
  overlay.id = 'submit-modal';
  overlay.innerHTML = `
    <div class="submit-modal-card">
      <div class="submit-modal-title">ENVIE PARA O RANKING</div>
      <div class="submit-modal-stats">
        <div>fase ${stats.highestLevel}/10</div>
        <div>${pct}% cortado</div>
        <div>${formatDuration(elapsedSec)}</div>
      </div>
      <input
        type="text"
        id="submit-modal-input"
        placeholder="SEU APELIDO"
        maxlength="12"
        autocomplete="off"
        autocapitalize="characters"
        spellcheck="false"
      />
      <div class="submit-modal-rules">3-12 caracteres. so letras, numeros e _</div>
      <div class="submit-modal-feedback" id="submit-modal-feedback"></div>
      <div class="submit-modal-buttons">
        <button id="submit-modal-skip" class="submit-modal-btn submit-modal-btn-secondary">PULAR</button>
        <button id="submit-modal-send" class="submit-modal-btn submit-modal-btn-primary" disabled>ENVIAR</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = overlay.querySelector<HTMLInputElement>('#submit-modal-input')!;
  const sendBtn = overlay.querySelector<HTMLButtonElement>('#submit-modal-send')!;
  const skipBtn = overlay.querySelector<HTMLButtonElement>('#submit-modal-skip')!;
  const feedback = overlay.querySelector<HTMLDivElement>('#submit-modal-feedback')!;

  const cached = loadCachedNickname();
  if (cached) input.value = cached;

  const refreshValid = () => {
    const v = input.value.trim().toUpperCase();
    if (v !== input.value) input.value = v;
    const valid = NICKNAME_REGEX.test(v);
    sendBtn.disabled = !valid;
  };
  refreshValid();

  setTimeout(() => input.focus(), 50);

  input.addEventListener('input', refreshValid);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !sendBtn.disabled) {
      e.preventDefault();
      sendBtn.click();
    }
  });

  const close = () => {
    overlay.remove();
  };

  skipBtn.addEventListener('click', () => {
    close();
    cb.onSkipped();
  });

  sendBtn.addEventListener('click', async () => {
    const nickname = input.value.trim().toUpperCase();
    if (!NICKNAME_REGEX.test(nickname)) return;
    sendBtn.disabled = true;
    skipBtn.disabled = true;
    sendBtn.textContent = 'ENVIANDO...';
    feedback.textContent = '';
    feedback.className = 'submit-modal-feedback';
    try {
      const payload = buildSubmitPayload(nickname, allLevels);
      await submitScore(payload);
      saveCachedNickname(nickname);
      feedback.textContent = 'ENVIADO!';
      feedback.classList.add('submit-modal-feedback-ok');
      setTimeout(() => {
        close();
        cb.onSubmitted();
      }, 800);
    } catch (e) {
      const msg = e instanceof RankingApiError ? e.message : 'Erro inesperado';
      feedback.textContent = msg;
      feedback.classList.add('submit-modal-feedback-err');
      sendBtn.disabled = false;
      skipBtn.disabled = false;
      sendBtn.textContent = 'ENVIAR';
    }
  });
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}
