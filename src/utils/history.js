const KEY = 'reader-history';
const MAX = 50;

export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

export function addHistory(entry) {
  const list = getHistory().filter(h => h.name !== entry.name);
  list.unshift({
    ...entry,
    lastOpened: Date.now(),
  });
  if (list.length > MAX) list.length = MAX;
  localStorage.setItem(KEY, JSON.stringify(list));
  return list;
}

export function removeHistory(name) {
  const list = getHistory().filter(h => h.name !== name);
  localStorage.setItem(KEY, JSON.stringify(list));
  return list;
}

export function clearAllData() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith('reader-')) keys.push(k);
  }
  keys.forEach(k => localStorage.removeItem(k));
}
