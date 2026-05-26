const DB_NAME = 'reader-files';
const STORE = 'files';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = reject;
  });
}

export async function saveFileToDB(name, arrayBuffer) {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put(arrayBuffer, name);
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
}

export async function getFileFromDB(name) {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readonly');
  const req = tx.objectStore(STORE).get(name);
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = reject;
  });
}

export async function deleteFileFromDB(name) {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).delete(name);
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
}

function extractFilename(url) {
  const parts = url.split('/');
  const rawName = parts[parts.length - 1].split('?')[0];
  return decodeURIComponent(rawName) || 'document.pdf';
}

/**
 * Stream a response body with progress tracking.
 * Returns the accumulated Blob.
 */
async function streamWithProgress(response, onProgress) {
  const contentLength = response.headers.get('Content-Length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  const reader = response.body.getReader();
  const chunks = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (onProgress) {
      onProgress({ loaded, total, percent: total ? Math.round((loaded / total) * 100) : -1 });
    }
  }

  return new Blob(chunks);
}

/**
 * Fetch a file from URL with progress tracking.
 * Tries direct fetch first, falls back to server proxy if CORS blocks it.
 * Returns { blob, name } on success.
 */
export async function fetchFileFromUrl(url, onProgress) {
  const name = extractFilename(url);
  let blob;

  try {
    // Try direct fetch first
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/pdf,application/epub+zip,*/*',
      },
      mode: 'cors',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    blob = await streamWithProgress(response, onProgress);
  } catch (err) {
    // CORS or network error — try server proxy
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      let msg = `HTTP ${response.status}`;
      try { msg = JSON.parse(body).error || msg; } catch {}
      throw new Error(msg);
    }
    blob = await streamWithProgress(response, onProgress);
  }

  // Cache to IndexedDB
  const buffer = await blob.arrayBuffer();
  await saveFileToDB(name, buffer);

  return { blob, name };
}
