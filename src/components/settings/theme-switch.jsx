import { h } from 'preact';

export function ThemeSwitch({ theme, setTheme, t }) {
  return (
    <div class="settings-section">
      <h4>{t('settings.theme')}</h4>
      <div class="theme-options">
        <button
          class={`theme-btn theme-btn-blue ${theme === 'blue' ? 'active' : ''}`}
          onClick={() => setTheme('blue')}
          title={t('settings.theme.blue')}
        />
        <button
          class={`theme-btn theme-btn-white ${theme === 'white' ? 'active' : ''}`}
          onClick={() => setTheme('white')}
          title={t('settings.theme.white')}
        />
        <button
          class={`theme-btn theme-btn-dark ${theme === 'dark' ? 'active' : ''}`}
          onClick={() => setTheme('dark')}
          title={t('settings.theme.dark')}
        />
        <button
          class={`theme-btn theme-btn-green ${theme === 'green' ? 'active' : ''}`}
          onClick={() => setTheme('green')}
          title={t('settings.theme.green')}
        />
      </div>
    </div>
  );
}
