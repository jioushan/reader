import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export function PdfViewer({ file, page, zoom, rotation, onPageChange, onTotalPages }) {
  const canvasRef = useRef(null);
  const [pdf, setPdf] = useState(null);
  const [error, setError] = useState(null);
  const renderTaskRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const loadPdf = async () => {
      try {
        let arrayBuffer;
        if (file.url) {
          // Local file or URL import — always fetch as ArrayBuffer
          // because the pdf.js web worker cannot access blob: URLs
          const res = await fetch(file.url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          arrayBuffer = await res.arrayBuffer();
        } else {
          // Server file — fetch explicitly for better error messages
          const url = `/library/${encodeURIComponent(file.name)}`;
          const res = await fetch(url);
          if (!res.ok) {
            if (res.status === 404) throw new Error('File not found on server');
            throw new Error(`HTTP ${res.status}`);
          }
          arrayBuffer = await res.arrayBuffer();
        }

        if (cancelled) return;
        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
          throw new Error('Empty file');
        }

        const doc = await pdfjsLib.getDocument({
          data: arrayBuffer,
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

        const viewport = p.getViewport({ scale: zoom, rotation });

        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext('2d');
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
      <div class="pdf-canvas-wrapper">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
