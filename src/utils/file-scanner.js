export async function scanFiles() {
  // Try dynamic API first (Docker mode)
  try {
    const res = await fetch('/api/files');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length >= 0) return data;
    }
  } catch {}

  // Fallback to static manifest
  try {
    const res = await fetch('/library/manifest.json');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch {}

  return [];
}

export function getFileType(name) {
  const ext = name.split('.').pop().toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'epub') return 'epub';
  return null;
}

export function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}
