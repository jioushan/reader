import { useState, useCallback, useMemo } from 'preact/hooks';

import en from '../i18n/en.json';
import zh from '../i18n/zh.json';
import ja from '../i18n/ja.json';
import ko from '../i18n/ko.json';
import fr from '../i18n/fr.json';
import es from '../i18n/es.json';
import de from '../i18n/de.json';

const LANGS = { en, zh, ja, ko, fr, es, de };
const LANG_NAMES = {
  en: 'English', zh: '中文', ja: '日本語', ko: '한국어',
  fr: 'Français', es: 'Español', de: 'Deutsch'
};

function detectLang() {
  const saved = localStorage.getItem('reader-lang');
  if (saved && LANGS[saved]) return saved;
  const nav = navigator.language.toLowerCase();
  if (nav.startsWith('zh')) return 'zh';
  if (nav.startsWith('ja')) return 'ja';
  if (nav.startsWith('ko')) return 'ko';
  if (nav.startsWith('fr')) return 'fr';
  if (nav.startsWith('es')) return 'es';
  if (nav.startsWith('de')) return 'de';
  return 'en';
}

export function useI18n() {
  const [lang, setLangState] = useState(detectLang);

  const setLang = useCallback((l) => {
    setLangState(l);
    localStorage.setItem('reader-lang', l);
  }, []);

  const t = useCallback((key, params) => {
    let str = (LANGS[lang] || LANGS.en)[key] || LANGS.en[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, v);
      });
    }
    return str;
  }, [lang]);

  const languages = useMemo(() =>
    Object.entries(LANG_NAMES).map(([code, name]) => ({ code, name }))
  , []);

  return { lang, setLang, t, languages };
}
