import { h, Fragment } from 'preact';
import { useState, useEffect, useMemo, useRef, useCallback } from 'preact/hooks';
import { BookCard } from './book-card';
import { scanFiles, getFileType } from '../../utils/file-scanner';
import { getAllProgress } from '../../utils/progress';
import { getHistory, removeHistory } from '../../utils/history';
import { fetchFileFromUrl } from '../../utils/url-fetch';
import { ContextMenu } from '../common/context-menu';

export function BookList({ onOpen, onOpenSettings, t }) {
  const [files, setFiles] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [progressMap, setProgressMap] = useState({});
  const [history, setHistory] = useState([]);
  const [showUrlImport, setShowUrlImport] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Download progress state
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadFileName, setDownloadFileName] = useState('');

  useEffect(() => {
    scanFiles().then(f => {
      setFiles(f);
      setLoading(false);
    });
    setProgressMap(getAllProgress());
    setHistory(getHistory());
  }, []);

  const filtered = useMemo(() => {
    if (!query) return files;
    const q = query.toLowerCase();
    return files.filter(f => f.name.toLowerCase().includes(q));
  }, [files, query]);

  const handleFileUpload = (e) => {
    const uploaded = Array.from(e.target.files || []);
    uploaded.forEach(file => {
      const type = getFileType(file.name);
      if (!type) return;
      const url = URL.createObjectURL(file);
      onOpen({ name: file.name, url, type, local: true });
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files || []);
    dropped.forEach(file => {
      const type = getFileType(file.name);
      if (!type) return;
      const url = URL.createObjectURL(file);
      onOpen({ name: file.name, url, type, local: true });
    });
  };

  const handleUrlOpen = useCallback(async () => {
    const url = urlInput.trim();
    if (!url) return;

    // Extract filename for display
    const parts = url.split('/');
    const rawName = parts[parts.length - 1].split('?')[0];
    const name = decodeURIComponent(rawName) || 'document.pdf';
    const type = getFileType(name) || 'pdf';

    setUrlInput('');
    setShowUrlImport(false);
    setDownloading(true);
    setDownloadProgress(0);
    setDownloadFileName(name);

    try {
      const result = await fetchFileFromUrl(url, ({ percent }) => {
        setDownloadProgress(percent >= 0 ? percent : -1);
      });
      const blobUrl = URL.createObjectURL(result.blob);
      setDownloading(false);
      onOpen({ name: result.name, url: blobUrl, type, local: true });
    } catch (err) {
      setDownloading(false);
      alert(t('library.importUrl.error') + ': ' + err.message);
    }
  }, [urlInput, onOpen, t]);

  const handleRemoveHistory = (e, name) => {
    e.stopPropagation();
    const updated = removeHistory(name);
    setHistory(updated);
  };

  // Context menu actions
  const handleContextAction = useCallback((action) => {
    if (action === 'upload') {
      fileInputRef.current?.click();
    } else if (action === 'importUrl') {
      setShowUrlImport(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, []);

  const contextItems = [
    { action: 'upload', label: t('library.upload') },
    { action: 'importUrl', label: t('library.importUrl') },
  ];

  const hasContent = filtered.length > 0 || history.length > 0;

  if (loading) {
    return (
      <div class="library">
        <div class="viewer-loading">
          <div class="spinner" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <ContextMenu items={contextItems} onAction={handleContextAction}>
      <div class="library" onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
        {/* Hidden file input for context menu upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.epub"
          multiple
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />

        <div class="library-header">
          <h1>{t('library.title')}</h1>
          <div class="library-search">
            <input
              ref={showUrlImport ? inputRef : undefined}
              type="text"
              placeholder={t('library.search')}
              value={query}
              onInput={e => setQuery(e.target.value)}
            />
          </div>
          <div class="library-actions">
            <button class="icon-btn" onClick={onOpenSettings} title={t('reader.settings')}>
              &#9881;
            </button>
          </div>
        </div>

        {/* URL Import Bar - always accessible */}
        {showUrlImport && (
          <div class="url-import-bar">
            <input
              ref={inputRef}
              type="url"
              placeholder={t('library.importUrl.placeholder')}
              value={urlInput}
              onInput={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUrlOpen()}
              style={{ flex: 1 }}
            />
            <button onClick={handleUrlOpen}>{t('library.importUrl.open')}</button>
          </div>
        )}

        {/* History Section */}
        {history.length > 0 && !query && (
          <div class="history-section">
            <h2 class="history-title">{t('library.history')}</h2>
            <div class="history-grid">
              {history.map(item => (
                <div key={item.name} class="history-card" onClick={() => onOpen(item)}>
                  <div class="history-card-badge">{item.type}</div>
                  <div class="history-card-title" title={item.name}>{item.name}</div>
                  <div class="history-card-meta">
                    <span>{new Date(item.lastOpened).toLocaleDateString()}</span>
                    <button
                      class="bookmark-delete"
                      onClick={(e) => handleRemoveHistory(e, item.name)}
                      title={t('library.clearHistory')}
                    >
                      &#10005;
                    </button>
                  </div>
                  {progressMap[item.name] && (
                    <div class="book-card-progress">
                      <div
                        class="book-card-progress-bar"
                        style={{
                          width: `${Math.round((progressMap[item.name].page / (progressMap[item.name].totalPages || 1)) * 100)}%`
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Library Files from server */}
        {filtered.length > 0 && (
          <div>
            {history.length > 0 && !query && (
              <h2 class="history-title" style={{ margin: '16px 24px 8px' }}>
                {t('library.files', { count: filtered.length })}
              </h2>
            )}
            <div class="library-grid">
              {filtered.map(file => (
                <BookCard
                  key={file.name}
                  file={file}
                  progress={progressMap[file.name]}
                  onOpen={onOpen}
                  t={t}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!hasContent && (
          <div class="library-empty">
            <h2>{query ? t('library.empty') : t('library.empty')}</h2>
            <p>{query ? '' : t('library.empty.desc')}</p>
            {!query && (
              <div class="empty-actions">
                <label class="file-upload-area">
                  <input
                    type="file"
                    accept=".pdf,.epub"
                    multiple
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <span>{t('library.upload')}</span>
                </label>
                <div
                  class="file-upload-area"
                  onClick={() => setShowUrlImport(!showUrlImport)}
                >
                  <span>{t('library.importUrl')}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Download progress overlay */}
        {downloading && (
          <div class="download-overlay">
            <div class="download-dialog">
              <div class="download-icon">&#8681;</div>
              <div class="download-filename">{downloadFileName}</div>
              <div class="download-progress-bar">
                <div
                  class="download-progress-fill"
                  style={{ width: downloadProgress >= 0 ? `${downloadProgress}%` : '100%' }}
                />
              </div>
              <div class="download-status">
                {downloadProgress >= 0
                  ? `${downloadProgress}%`
                  : t('library.downloading')
                }
              </div>
            </div>
          </div>
        )}
      </div>
    </ContextMenu>
  );
}
