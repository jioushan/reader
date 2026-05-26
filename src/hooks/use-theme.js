import { useState, useCallback, useEffect } from 'preact/hooks';

const THEMES = ['blue', 'white', 'dark', 'green'];

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('reader-theme') || 'blue';
  });

  const setTheme = useCallback((t) => {
    setThemeState(t);
    localStorage.setItem('reader-theme', t);
    // 'blue' is default :root, so no data-theme attribute needed
    document.documentElement.setAttribute('data-theme', t === 'blue' ? '' : t);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'blue' ? '' : theme);
  }, []);

  return { theme, setTheme, themes: THEMES };
}
