import { describe, it, expect, beforeEach } from 'vitest';
import { adoptNicknameFromUrl, loadCachedNickname, saveCachedNickname } from './RunStats';

function setUrlSearch(search: string): void {
  // jsdom permite reescrever location via reload — usamos history.replaceState
  // que e cheap e nao recarrega a pagina (evita destruir o jsdom).
  const url = new URL(window.location.href);
  url.search = search;
  window.history.replaceState({}, '', url.toString());
}

describe('adoptNicknameFromUrl', () => {
  beforeEach(() => {
    localStorage.clear();
    setUrlSearch('');
  });

  it('seed cache quando URL traz nickname valido em uppercase', () => {
    setUrlSearch('?nickname=ANDRE');
    adoptNicknameFromUrl();
    expect(loadCachedNickname()).toBe('ANDRE');
  });

  it('aceita lowercase via toUpperCase interno', () => {
    setUrlSearch('?nickname=andre');
    adoptNicknameFromUrl();
    expect(loadCachedNickname()).toBe('ANDRE');
  });

  it('aceita underscore e digitos', () => {
    setUrlSearch('?nickname=GAMER_2026');
    adoptNicknameFromUrl();
    expect(loadCachedNickname()).toBe('GAMER_2026');
  });

  it('rejeita silenciosamente nickname com menos de 3 chars', () => {
    saveCachedNickname('PREVIA');
    setUrlSearch('?nickname=AB');
    adoptNicknameFromUrl();
    expect(loadCachedNickname()).toBe('PREVIA');
  });

  it('rejeita silenciosamente nickname com mais de 12 chars', () => {
    saveCachedNickname('PREVIA');
    setUrlSearch('?nickname=ABCDEFGHIJKLM');
    adoptNicknameFromUrl();
    expect(loadCachedNickname()).toBe('PREVIA');
  });

  it('rejeita acentuados', () => {
    saveCachedNickname('PREVIA');
    // ANDRÉ contem E com acento agudo, fora de [A-Z0-9_]
    setUrlSearch('?nickname=' + encodeURIComponent('ANDRÉ'));
    adoptNicknameFromUrl();
    expect(loadCachedNickname()).toBe('PREVIA');
  });

  it('rejeita espacos URL-encoded (%20)', () => {
    saveCachedNickname('PREVIA');
    setUrlSearch('?nickname=ANDRE%20HZ');
    adoptNicknameFromUrl();
    expect(loadCachedNickname()).toBe('PREVIA');
  });

  it('rejeita HTML chars', () => {
    saveCachedNickname('PREVIA');
    setUrlSearch('?nickname=<script>');
    adoptNicknameFromUrl();
    expect(loadCachedNickname()).toBe('PREVIA');
  });

  it('preserva cache existente quando param ausente', () => {
    saveCachedNickname('PREVIA');
    setUrlSearch('');
    adoptNicknameFromUrl();
    expect(loadCachedNickname()).toBe('PREVIA');
  });

  it('preserva cache existente quando param vazio', () => {
    saveCachedNickname('PREVIA');
    setUrlSearch('?nickname=');
    adoptNicknameFromUrl();
    expect(loadCachedNickname()).toBe('PREVIA');
  });

  it('sobrescreve cache existente quando URL traz valido (P2-G7.5-01 documentado)', () => {
    saveCachedNickname('ANTIGO');
    setUrlSearch('?nickname=NOVO');
    adoptNicknameFromUrl();
    expect(loadCachedNickname()).toBe('NOVO');
  });

  it('URLSearchParams.get retorna primeiro de duplicates', () => {
    saveCachedNickname('PREVIA');
    setUrlSearch('?nickname=PRIMEIRO&nickname=SEGUNDO');
    adoptNicknameFromUrl();
    expect(loadCachedNickname()).toBe('PRIMEIRO');
  });
});
