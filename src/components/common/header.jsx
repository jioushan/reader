import { h } from 'preact';

export function Header({ title, onBack, right }) {
  return (
    <header class="toolbar">
      {onBack && (
        <button class="icon-btn" onClick={onBack} title="Back">
          &#8592;
        </button>
      )}
      <span class="toolbar-title">{title}</span>
      {right}
    </header>
  );
}
