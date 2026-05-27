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

  // Load PDF document
  useEffect(() => {
    let cancelled = false;
    const loadPdf = async () => {
      try {
        let data;
        if (file.url) {
          // Local file (blob URL from upload/import) - convert to ArrayBuffer
          // because pdf.js worker cannot fetch blob URLs cross-origin
          const res = await fetch(file.url);
          data = await res.arrayBuffer();
        } else {
          // Server file - use URL directly
          data = `/library/${encodeURIComponent(file.name)}`;
        }

        if (cancelled) return;

        const doc = await pdfjsLib.getDocument({
          data: typeof data === 'string' ? undefined : data,
          url: typeof data === 'string' ? data : undefined,
          cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
        }).promise;

        if (cancelled) return;
        setPdf(doc);
        setError(null);
        onTotalPages(doc.numPages);
      } catch (e) {
        if (!cancelled) {
          console.error('PDF load error:', e);
          setError(e.message || 'Failed to load PDF');
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

  // Render current page
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

        // Calculate scale to fit wrapper width
        const wrapper = wrapperRef.current;
        const containerWidth = wrapper ? wrapper.clientWidth : (window.innerWidth - 40);
        const fitScale = containerWidth / baseViewport.width;
        const scale = fitScale * zoom;

        const viewport = p.getViewport({ scale, rotation });

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Canvas internal resolution (high DPI)
        canvas.width = Math.round(viewport.width * dpr);
        canvas.height = Math.round(viewport.height * dpr);
        // Canvas display size (CSS pixels)
        canvas.style.width = Math.round(viewport.width) + 'px';
        canvas.style.height = Math.round(viewport.height) + 'px';

        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const task = p.render({ canvasContext: ctx, viewport });
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
