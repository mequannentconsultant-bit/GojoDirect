export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'ethioserve_theme';

/**
 * Retrieves the persisted theme from localStorage, or detects system preference.
 */
export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // fallback
  }
  return 'light';
}

/**
 * Applies dark/light class and attributes to document.documentElement
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  }
}

/**
 * Persists selected theme and applies it globally to document
 */
export function saveStoredTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // fallback
  }
  applyTheme(theme);
}

/**
 * Convenience toggle helper
 */
export function toggleTheme(current: Theme): Theme {
  const next: Theme = current === 'dark' ? 'light' : 'dark';
  saveStoredTheme(next);
  return next;
}
