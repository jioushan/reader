import { h } from 'preact';

// NOTE: This component is not currently used.
// Kept for potential future use with non-PDF/EPUB formats.
export function IframeViewer({ file }) {
  const url = file.url || `/library/${encodeURIComponent(file.name)}`;
  return (
    <div class="viewer-area">
      <iframe src={url} class="iframe-viewer" title={file.name} />
    </div>
  );
}
