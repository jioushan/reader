import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';

const DB_NAME = 'reader-fonts';
const STORE = 'fonts';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = reject;
  });
}

async function saveFont(name, data) {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put(data, name);
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
}

async function loadFont(name) {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readonly');
  const req = tx.objectStore(STORE).get(name);
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = reject;
  });
}

async function deleteFont(name) {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).delete(name);
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
}

async function getAllFontNames() {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readonly');
  const req = tx.objectStore(STORE).getAllKeys();
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = reject;
  });
}

export function FontUpload({ t }) {
  const [fonts, setFonts] = useState([]);
  const [activeFont, setActiveFont] = useState(() => localStorage.getItem('reader-font') || '');
  const fileRef = useRef(null);

  useEffect(() => {
    getAllFontNames().then(setFonts);
    if (activeFont) applyFont(activeFont);
  }, []);

  const applyFont = async (name) => {
    if (!name) {
      document.body.style.fontFamily = '';
      localStorage.removeItem('reader-font');
      setActiveFont('');
      return;
    }
    const data = await loadFont(name);
    if (data) {
      const face = new FontFace(name, data);
      await face.load();
      document.fonts.add(face);
      document.body.style.fontFamily = `"${name}", sans-serif`;
      localStorage.setItem('reader-font', name);
      setActiveFont(name);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const name = file.name.replace(/\.(ttf|woff2?)$/, '');
    await saveFont(name, buffer);
    setFonts(await getAllFontNames());
    applyFont(name);
  };

  const handleDelete = async (name) => {
    await deleteFont(name);
    setFonts(await getAllFontNames());
    if (activeFont === name) applyFont('');
  };

  return (
    <div class="settings-section">
      <h4>{t('settings.font')}</h4>
      <label class="font-upload-btn">
        <input ref={fileRef} type="file" accept=".ttf,.woff,.woff2" onChange={handleUpload} style={{ display: 'none' }} />
        {t('settings.font.upload')}
      </label>
      <div class="font-list">
        <div class="font-item" onClick={() => applyFont('')} style={{ cursor: 'pointer', opacity: activeFont ? 0.6 : 1 }}>
          <span>{t('settings.font.default')}</span>
        </div>
        {fonts.map(name => (
          <div key={name} class="font-item" style={{ cursor: 'pointer', opacity: activeFont === name ? 1 : 0.6 }}>
            <span onClick={() => applyFont(name)} style={{ flex: 1 }}>{name}</span>
            <button class="bookmark-delete" onClick={() => handleDelete(name)}>{t('settings.font.clear')}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
