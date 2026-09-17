/** Day / night + accent color for ShelfTrack PWA */

export type ThemeMode = 'day' | 'night';

const MODE_KEY = 'st-theme-mode';
const ACCENT_KEY = 'st-accent';

export const ACCENT_PRESETS = [
  { id: 'indigo', label: 'Indigo', hex: '#4f46e5' },
  { id: 'blue', label: 'Blue', hex: '#2563eb' },
  { id: 'teal', label: 'Teal', hex: '#0d9488' },
  { id: 'emerald', label: 'Emerald', hex: '#059669' },
  { id: 'amber', label: 'Amber', hex: '#d97706' },
  { id: 'rose', label: 'Rose', hex: '#e11d48' },
  { id: 'violet', label: 'Violet', hex: '#7c3aed' },
  { id: 'slate', label: 'Slate', hex: '#475569' },
] as const;

export function getThemeMode(): ThemeMode {
  try {
    const v = localStorage.getItem(MODE_KEY);
    return v === 'night' ? 'night' : 'day';
  } catch {
    return 'day';
  }
}

export function setThemeMode(mode: ThemeMode): ThemeMode {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    /* ignore */
  }
  applyThemeToDocument();
  return mode;
}

export function getAccent(): string {
  try {
    const v = localStorage.getItem(ACCENT_KEY);
    if (v && /^#[0-9a-fA-F]{6}$/.test(v)) return v;
  } catch {
    /* ignore */
  }
  return '#4f46e5';
}

export function setAccent(hex: string): string {
  const clean = hex.startsWith('#') ? hex : `#${hex}`;
  const next = /^#[0-9a-fA-F]{6}$/.test(clean) ? clean : '#4f46e5';
  try {
    localStorage.setItem(ACCENT_KEY, next);
  } catch {
    /* ignore */
  }
  applyThemeToDocument();
  return next;
}

export function applyThemeToDocument(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const mode = getThemeMode();
  const accent = getAccent();
  root.setAttribute('data-theme', mode);
  root.style.setProperty('--st-primary', accent);
  root.style.setProperty(
    '--st-primary-soft',
    `color-mix(in srgb, ${accent} 14%, ${mode === 'night' ? '#0f172a' : '#ffffff'})`
  );
  root.style.setProperty(
    '--st-primary-muted',
    `color-mix(in srgb, ${accent} 22%, ${mode === 'night' ? '#1e293b' : '#eef2ff'})`
  );
}

export function initTheme(): void {
  applyThemeToDocument();
}
