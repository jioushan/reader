const PREFIX = 'reader-progress';

export function getProgress(fileId) {
  try {
    const data = localStorage.getItem(`${PREFIX}:${fileId}`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveProgress(fileId, data) {
  try {
    localStorage.setItem(`${PREFIX}:${fileId}`, JSON.stringify({
      ...data,
      updatedAt: Date.now(),
    }));
  } catch {}
}

export function getAllProgress() {
  const result = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(`${PREFIX}:`)) {
      try {
        result[key.slice(PREFIX.length + 1)] = JSON.parse(localStorage.getItem(key));
      } catch {}
    }
  }
  return result;
}
