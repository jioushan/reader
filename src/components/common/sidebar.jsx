import { h } from 'preact';
import { useState } from 'preact/hooks';

export function Sidebar({
  open, onClose, tab, onTabChange,
  toc, onTocClick, bookmarks, onBookmarkClick, onAddBookmark, onDeleteBookmark,
  settings, t
}) {
  if (!open) return null;

  return (
    <div>
      <div class="sidebar-overlay" onClick={onClose} />
      <div class="sidebar open">
        <div class="sidebar-header">
          <h3>{tab === 'toc' ? t('reader.toc') : tab === 'bookmarks' ? t('reader.bookmarks') : t('reader.settings')}</h3>
          <button class="icon-btn" onClick={onClose}>&#10005;</button>
        </div>

        <div class="sidebar-tabs">
          <button class={`sidebar-tab ${tab === 'toc' ? 'active' : ''}`} onClick={() => onTabChange('toc')}>
            {t('reader.toc')}
          </button>
          <button class={`sidebar-tab ${tab === 'bookmarks' ? 'active' : ''}`} onClick={() => onTabChange('bookmarks')}>
            {t('reader.bookmarks')}
          </button>
          <button class={`sidebar-tab ${tab === 'settings' ? 'active' : ''}`} onClick={() => onTabChange('settings')}>
            {t('reader.settings')}
          </button>
        </div>

        <div class="sidebar-content">
          {tab === 'toc' && (
            <div>
              {toc && toc.length > 0 ? toc.map((item, i) => (
                <div
                  key={i}
                  class={`toc-item indent-${item.level || 0}`}
                  onClick={() => { onTocClick(item); onClose(); }}
                >
                  {item.label}
                </div>
              )) : <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>—</p>}
            </div>
          )}

          {tab === 'bookmarks' && (
            <div>
              <button onClick={onAddBookmark} style={{ width: '100%', marginBottom: '12px' }}>
                {t('reader.addBookmark')}
              </button>
              {bookmarks.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                  {t('reader.noBookmarks')}
                </p>
              ) : bookmarks.map(b => (
                <div key={b.id} class="bookmark-item" onClick={() => onBookmarkClick(b)}>
                  <div class="bookmark-item-info">
                    <div class="bookmark-item-title">{b.title || `${t('reader.page')} ${b.page || ''}`}</div>
                    <div class="bookmark-item-date">{new Date(b.createdAt).toLocaleDateString()}</div>
                  </div>
                  <button class="bookmark-delete" onClick={(e) => { e.stopPropagation(); onDeleteBookmark(b.id); }}>
                    &#10005;
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === 'settings' && settings}
        </div>
      </div>
    </div>
  );
}
