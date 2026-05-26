import { h, Fragment } from 'preact';
import { lazy, Suspense } from 'preact/compat';
import { useState, useCallback, useEffect, useRef } from 'preact/hooks';
import { BookList } from './components/library/book-list';
import { Toolbar } from './components/reader/toolbar';
import { Sidebar } from './components/common/sidebar';
import { ThemeSwitch } from './components/settings/theme-switch';
import { LangSwitch } from './components/settings/lang-switch';
import { FontUpload } from './components/settings/font-upload';

const PdfViewer = lazy(() => import('./components/reader/pdf-viewer.jsx').then(m => ({ default: m.PdfViewer })));
const EpubViewer = lazy(() => import('./components/reader/epub-viewer.jsx').then(m => ({ default: m.EpubViewer })));
import { useI18n } from './hooks/use-i18n';
import { useTheme } from './hooks/use-theme';
import { getProgress, saveProgress } from './utils/progress';
import { getBookmarks, addBookmark, removeBookmark } from './utils/bookmarks';
import { getFileType } from './utils/file-scanner';
import { addHistory, clearAllData } from './utils/history';

function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;
}

export function App() {
  const { lang, setLang, t, languages } = useI18n();
  const { theme, setTheme } = useTheme();

  const [currentFile, setCurrentFile] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('toc');
  const [toc, setToc] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [epubMode, setEpubMode] = useState('paginated');
  const [showSettings, setShowSettings] = useState(false);
  const [volumeKeyEnabled, setVolumeKeyEnabled] = useState(() => localStorage.getItem('reader-volumekey') === 'true');

  // Fullscreen UI state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const progressTimerRef = useRef(null);

  // Track fullscreen state
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleVolumeKey = useCallback(() => {
    setVolumeKeyEnabled(prev => {
      const next = !prev;
      localStorage.setItem('reader-volumekey', String(next));
      return next;
    });
  }, []);

  const openFile = useCallback((file) => {
    const type = file.type || getFileType(file.name);
    if (!type) return;
    const fileData = { ...file, type };
    setCurrentFile(fileData);
    setPage(1);
    setZoom(1);
    setRotation(0);
    setToc([]);
    setBookmarks(getBookmarks(file.name));

    // Track in history
    addHistory({ name: file.name, type, size: file.size, url: file.url });

    const saved = getProgress(file.name);
    if (saved) {
      if (saved.page) setPage(saved.page);
      if (saved.zoom) setZoom(saved.zoom);
    }
  }, []);

  const closeFile = useCallback(() => {
    if (currentFile) {
      saveProgress(currentFile.name, { page, totalPages, zoom, rotation });
    }
    setCurrentFile(null);
    setSidebarOpen(false);
    setShowProgress(false);
  }, [currentFile, page, totalPages, zoom, rotation]);

  // Auto-save progress periodically
  useEffect(() => {
    if (!currentFile) return;
    const timer = setInterval(() => {
      saveProgress(currentFile.name, { page, totalPages, zoom, rotation });
    }, 10000);
    return () => clearInterval(timer);
  }, [currentFile, page, totalPages, zoom, rotation]);

  const handlePageChange = useCallback((p) => {
    const newPage = Math.max(1, Math.min(p, totalPages || 1));
    setPage(newPage);
  }, [totalPages]);

  const handlePrevPage = useCallback(() => handlePageChange(page - 1), [page, handlePageChange]);
  const handleNextPage = useCallback(() => handlePageChange(page + 1), [page, handlePageChange]);

  const handleZoomIn = useCallback(() => setZoom(z => Math.min(z + 0.2, 3)), []);
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(z - 0.2, 0.4)), []);
  const handleRotate = useCallback(() => setRotation(r => (r + 90) % 360), []);

  const handleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }, []);

  // Show progress bar temporarily
  const flashProgress = useCallback(() => {
    setShowProgress(true);
    if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    progressTimerRef.current = setTimeout(() => setShowProgress(false), 3000);
  }, []);

  // Fullscreen keyboard & touch controls
  useEffect(() => {
    if (!currentFile) return;

    const handleKeyDown = (e) => {
      if (!isFullscreen) return;

      // Arrow keys for PC
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevPage();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextPage();
      } else if (e.key === ' ') {
        e.preventDefault();
        flashProgress();
      }
    };

    // Volume keys for Android (mapped as MediaVolumeUp/Down)
    const handleMediaKey = (e) => {
      if (!isFullscreen || !volumeKeyEnabled) return;
      if (e.key === 'VolumeUp') {
        e.preventDefault();
        handlePrevPage();
      } else if (e.key === 'VolumeDown') {
        e.preventDefault();
        handleNextPage();
      }
    };

    // Touch controls for mobile fullscreen
    const handleTouchEnd = (e) => {
      if (!isFullscreen || !isMobile()) return;
      const touch = e.changedTouches[0];
      const x = touch.clientX;
      const w = window.innerWidth;
      const ratio = x / w;

      if (ratio < 0.33) {
        // Left 1/3 → previous page
        handlePrevPage();
      } else if (ratio > 0.67) {
        // Right 1/3 → next page
        handleNextPage();
      } else {
        // Center 1/3 → show progress bar
        flashProgress();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleMediaKey);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', handleMediaKey);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isFullscreen, currentFile, handlePrevPage, handleNextPage, flashProgress, volumeKeyEnabled]);

  const handleAddBookmark = useCallback(() => {
    if (!currentFile) return;
    const title = `${t('reader.page')} ${page}`;
    const updated = addBookmark(currentFile.name, { page, title, cfi: null });
    setBookmarks(updated);
  }, [currentFile, page, t]);

  const handleDeleteBookmark = useCallback((id) => {
    if (!currentFile) return;
    const updated = removeBookmark(currentFile.name, id);
    setBookmarks(updated);
  }, [currentFile]);

  const handleBookmarkClick = useCallback((b) => {
    if (b.page) setPage(b.page);
  }, []);

  const handleEpubLocationChange = useCallback((cfi, current, total) => {
    if (currentFile) {
      saveProgress(currentFile.name, { cfi, page: current, totalPages: total });
    }
  }, [currentFile]);

  const handleTocClick = useCallback((item) => {}, []);

  const settingsPanel = (
    <div class="settings-panel">
      <ThemeSwitch theme={theme} setTheme={setTheme} t={t} />
      <LangSwitch lang={lang} setLang={setLang} languages={languages} t={t} />
      <FontUpload t={t} />
      <div class="settings-section">
        <h4>{t('settings.volumeKey')}</h4>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}>
          <input
            type="checkbox"
            checked={volumeKeyEnabled}
            onChange={toggleVolumeKey}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <span>{t('settings.volumeKey.desc')}</span>
        </label>
      </div>
      {currentFile?.type === 'epub' && (
        <div class="settings-section">
          <h4>{t('reader.scrollMode')}</h4>
          <select value={epubMode} onChange={e => setEpubMode(e.target.value)} style={{ width: '100%' }}>
            <option value="paginated">{t('reader.pageMode')}</option>
            <option value="scrolled">{t('reader.scrollMode')}</option>
          </select>
        </div>
      )}
      <div class="settings-section">
        <h4>{t('settings.clearData')}</h4>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
          {t('settings.clearData.desc')}
        </p>
        <button
          onClick={() => {
            if (confirm(t('settings.clearData.confirm'))) {
              clearAllData();
              window.location.reload();
            }
          }}
          style={{ width: '100%', background: '#e74c3c' }}
        >
          {t('settings.clearData')}
        </button>
      </div>
    </div>
  );

  // Library page with settings modal
  if (!currentFile) {
    return (
      <Fragment>
        <BookList onOpen={openFile} onOpenSettings={() => setShowSettings(true)} t={t} />
        {showSettings && (
          <Fragment>
            <div class="sidebar-overlay" onClick={() => setShowSettings(false)} />
            <div class="sidebar open" style={{ width: '320px' }}>
              <div class="sidebar-header">
                <h3>{t('reader.settings')}</h3>
                <button class="icon-btn" onClick={() => setShowSettings(false)}>&#10005;</button>
              </div>
              <div class="sidebar-content">
                {settingsPanel}
              </div>
            </div>
          </Fragment>
        )}
      </Fragment>
    );
  }

  return (
    <div class="reader-container">
      <Toolbar
        title={currentFile.name}
        page={page}
        totalPages={currentFile.type === 'epub' ? undefined : totalPages}
        zoom={zoom}
        rotation={rotation}
        onPrev={handlePrevPage}
        onNext={handleNextPage}
        onPageChange={handlePageChange}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onRotate={handleRotate}
        onBack={closeFile}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onFullscreen={handleFullscreen}
        t={t}
      />

      <Suspense fallback={<div class="viewer-loading"><div class="spinner" /></div>}>
        {currentFile.type === 'pdf' && (
          <PdfViewer
            file={currentFile}
            page={page}
            zoom={zoom}
            rotation={rotation}
            onPageChange={handlePageChange}
            onTotalPages={setTotalPages}
          />
        )}

        {currentFile.type === 'epub' && (
          <EpubViewer
            file={currentFile}
            onLocationChange={handleEpubLocationChange}
            onToc={setToc}
            mode={epubMode}
          />
        )}
      </Suspense>

      {/* Fullscreen progress bar */}
      {isFullscreen && (
        <div
          class="fullscreen-progress-bar"
          style={{
            opacity: showProgress ? 1 : 0,
            pointerEvents: showProgress ? 'auto' : 'none',
          }}
        >
          <button class="icon-btn" onClick={handlePrevPage}>&#9664;</button>
          <input
            type="range"
            min={1}
            max={totalPages || 1}
            value={page}
            onInput={e => handlePageChange(parseInt(e.target.value))}
            style={{ flex: 1 }}
          />
          <span class="page-info">{page} / {totalPages}</span>
          <button class="icon-btn" onClick={handleNextPage}>&#9654;</button>
        </div>
      )}

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        tab={sidebarTab}
        onTabChange={setSidebarTab}
        toc={toc}
        onTocClick={handleTocClick}
        bookmarks={bookmarks}
        onBookmarkClick={handleBookmarkClick}
        onAddBookmark={handleAddBookmark}
        onDeleteBookmark={handleDeleteBookmark}
        settings={settingsPanel}
        t={t}
      />
    </div>
  );
}
