const PREFIX = 'reader-bookmarks';

export function getBookmarks(fileId) {
  try {
    const data = localStorage.getItem(`${PREFIX}:${fileId}`);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addBookmark(fileId, bookmark) {
  const list = getBookmarks(fileId);
  list.push({ ...bookmark, id: Date.now().toString(36), createdAt: Date.now() });
  localStorage.setItem(`${PREFIX}:${fileId}`, JSON.stringify(list));
  return list;
}

export function removeBookmark(fileId, bookmarkId) {
  const list = getBookmarks(fileId).filter(b => b.id !== bookmarkId);
  localStorage.setItem(`${PREFIX}:${fileId}`, JSON.stringify(list));
  return list;
}
