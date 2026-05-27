import { h } from 'preact';
import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import ePub from 'epubjs';

export function EpubViewer({ file, onLocationChange, onToc, mode = 'paginated' }) {
  const containerRef = useRef(null);
  const bookRef = useRef(null);
  const renditionRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;
    setError(null);

    const url = file.url || `/library/${encodeURIComponent(file.name)}`;
    const book = ePub(url);
    bookRef.current = book;

    const rendition = book.renderTo(containerRef.current, {
      width: '100%',
      height: '100%',
      spread: 'none',
      flow: mode === 'paginated' ? 'paginated' : 'scrolled-doc',
    });
    renditionRef.current = rendition;

    book.ready
      .then(() => book.loaded.navigation)
      .then(nav => {
        onToc(nav.toc);
        const saved = file.local ? null : localStorage.getItem(`reader-epub-loc:${file.name}`);
        if (saved) {
          rendition.display(saved);
        } else {
          rendition.display();
        }
      })
      .catch(e => {
        console.error('EPUB load error:', e);
        setError(e.message || 'Failed to load EPUB');
      });

    rendition.on('relocated', (location) => {
      if (location?.start) {
        onLocationChange(
          location.start.cfi,
          location.start.displayed?.page,
          location.start.displayed?.total
        );
      }
    });

    return () => {
      renditionRef.current = null;
      book.destroy();
    };
  }, [file.name, file.url]);

  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.flow(mode === 'paginated' ? 'paginated' : 'scrolled-doc');
    }
  }, [mode]);

  const goNext = useCallback(() => renditionRef.current?.next(), []);
  const goPrev = useCallback(() => renditionRef.current?.prev(), []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev]);

  if (error) {
    return (
      <div class="viewer-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>&#128214;</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div class="viewer-area" style={{ height: '100%' }}>
      <div ref={containerRef} class="epub-viewer" style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
