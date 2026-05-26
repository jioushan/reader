import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker from jsdelivr CDN (reliable, always available)
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export function PdfViewer({ file, page, zoom, rotation, onPageChange, onTotalPages }) {
  const canvasRef = useRef(null);
  const [pdf, setPdf] = useState(null);
  const renderTaskRef = useRef(null);

  // Load PDF document
  useEffect(() => {
    let cancelled = false;
    const loadPdf = async () => {
      try {
        const url = file.url || `/library/${encodeURIComponent(file.name)}`;
        const doc = await pdfjsLib.getDocument({
          url,
          cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
        }).promise;
        if (cancelled) return;
        setPdf(doc);
        onTotalPages(doc.numPages);
      } catch (e) {
        console.error('PDF load error:', e);
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
        const viewport = p.getViewport({ scale: zoom, rotation });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
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

  return (
    <div class="viewer-area">
      <div class="pdf-canvas-wrapper">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
