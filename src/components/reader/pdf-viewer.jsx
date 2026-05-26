import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export function PdfViewer({ file, page, zoom, rotation, onPageChange, onTotalPages }) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const [pdf, setPdf] = useState(null);
  const [error, setError] = useState(null);
  const renderTaskRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const loadPdf = async () => {
      try {
        const url = file.url || `/library/${encodeURIComponent(file.name)}`;
        const loadingTask = pdfjsLib.getDocument({
          url,
          cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
        });
        const doc = await loadingTask.promise;
        if (cancelled) return;
        setPdf(doc);
        setError(null);
        onTotalPages(doc.numPages);
      } catch (e) {
        if (!cancelled) {
          console.error('PDF load error:', e);
          setError(e.message);
        }
      }
    };
    loadPdf();
    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [file.name, file.url]);

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    let cancelled = false;

    const render = async () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      try {
        const p = await pdf.getPage(page);
        if (cancelled) return;

        const dpr = window.devicePixelRatio || 1;
        const baseViewport = p.getViewport({ scale: 1, rotation });
        const container = wrapperRef.current;
        const maxWidth = container
          ? container.clientWidth - 16
          : window.innerWidth - 16;
        const fitScale = maxWidth / baseViewport.width;
        const scale = fitScale * zoom;

        // Cap scale so canvas doesn't exceed GPU limits on mobile
        const maxCanvasWidth = 2048;
        const rawCanvasWidth = baseViewport.width * scale * dpr;
        const clampedScale = rawCanvasWidth > maxCanvasWidth
          ? (maxCanvasWidth / (baseViewport.width * dpr))
          : scale;

        const viewport = p.getViewport({ scale: clampedScale, rotation });
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = Math.floor(viewport.width) + 'px';
        canvas.style.height = Math.floor(viewport.height) + 'px';

        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const task = p.render({
          canvasContext: ctx,
          viewport,
          transform: [dpr, 0, 0, dpr, 0, 0],
        });
        renderTaskRef.current = task;
        await task.promise;
      } catch (e) {
        if (e?.name !== 'RenderingCancelledException') {
          console.error('PDF render error:', e);
        }
      }
    };

    render();
    return () => { cancelled = true; };
  }, [pdf, page, zoom, rotation]);

  if (error) {
    return (
      <div class="viewer-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>&#128196;</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div class="viewer-area">
      <div ref={wrapperRef} class="pdf-canvas-wrapper">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
