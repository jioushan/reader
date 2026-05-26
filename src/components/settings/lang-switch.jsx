import { h } from 'preact';

export function LangSwitch({ lang, setLang, languages, t }) {
  return (
    <div class="settings-section">
      <h4>{t('settings.language')}</h4>
      <select class="lang-select" value={lang} onChange={e => setLang(e.target.value)}>
        {languages.map(l => (
          <option key={l.code} value={l.code}>{l.name}</option>
        ))}
      </select>
    </div>
  );
}
