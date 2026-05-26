import { h } from 'preact';
import { getFileType, formatSize } from '../../utils/file-scanner';

export function BookCard({ file, progress, onOpen, t }) {
  const type = getFileType(file.name);
  const pct = progress ? Math.round((progress.page / (progress.totalPages || 1)) * 100) : 0;

  return (
    <div class="book-card" onClick={() => onOpen(file)}>
      <div class="book-card-title" title={file.name}>{file.name}</div>
      <div class="book-card-meta">
        <span class="book-card-badge">{type}</span>
        <span>{formatSize(file.size)}</span>
      </div>
      {progress && (
        <div class="book-card-progress">
          <div class="book-card-progress-bar" style={{ width: `${pct}%` }} />
        </div>
      )}
      {progress && (
        <div class="book-card-meta">
          <span>{t('library.resume')} - {t('reader.page')} {progress.page}</span>
        </div>
      )}
    </div>
  );
}
