import { h } from 'preact';

export function IframeViewer({ file }) {
  const url = file.url || `/library/${encodeURIComponent(file.name)}`;
  return (
    <div class="viewer-area">
      <iframe src={url} class="iframe-viewer" title={file.name} />
    </div>
  );
}
