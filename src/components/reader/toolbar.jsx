import { h } from 'preact';

export function Toolbar({
  title, page, totalPages, zoom, rotation,
  onPrev, onNext, onPageChange, onZoomIn, onZoomOut, onRotate,
  onBack, onToggleSidebar, onFullscreen, t
}) {
  const isEpub = totalPages === undefined;

  return (
    <div class="toolbar">
      <button class="icon-btn" onClick={onBack} title={t('reader.back')}>&#8592;</button>
      <div class="toolbar-separator" />

      {!isEpub && (
        <div class="toolbar-group">
          <button class="icon-btn" onClick={onPrev} title={t('reader.prev')}>&#9664;</button>
          <input
            type="number"
            value={page}
            min={1}
            max={totalPages || 1}
            onChange={e => onPageChange(parseInt(e.target.value) || 1)}
          />
          <span class="page-info">{t('reader.of')} {totalPages}</span>
          <button class="icon-btn" onClick={onNext} title={t('reader.next')}>&#9654;</button>
        </div>
      )}

      <div class="toolbar-separator" />

      <div class="toolbar-group">
        <button class="icon-btn" onClick={onZoomOut} title={t('reader.zoom') + ' -'}>&#8722;</button>
        <span class="page-info">{Math.round(zoom * 100)}%</span>
        <button class="icon-btn" onClick={onZoomIn} title={t('reader.zoom') + ' +'}>&#43;</button>
      </div>

      <div class="toolbar-separator" />

      <button class="icon-btn" onClick={onRotate} title={t('reader.rotate')}>&#8635;</button>

      <span class="toolbar-title">{title}</span>

      <button class="icon-btn" onClick={onToggleSidebar} title="&#9776;">&#9776;</button>
      <button class="icon-btn" onClick={onFullscreen} title={t('reader.fullscreen')}>&#x26F6;</button>
    </div>
  );
}
