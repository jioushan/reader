import { readdirSync, statSync, writeFileSync, existsSync } from 'fs';
import { join, extname } from 'path';

const LIBRARY_DIR = join(process.cwd(), 'public', 'library');
const OUTPUT = join(LIBRARY_DIR, 'manifest.json');

const ALLOWED = new Set(['.pdf', '.epub']);

function scan(dir) {
  const files = [];
  if (!existsSync(dir)) return files;
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || name === 'manifest.json') continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...scan(full).map(f => ({ ...f, name: `${name}/${f.name}` })));
    } else if (ALLOWED.has(extname(name).toLowerCase())) {
      files.push({ name, size: stat.size });
    }
  }
  return files;
}

const files = scan(LIBRARY_DIR);
writeFileSync(OUTPUT, JSON.stringify(files, null, 2));
console.log(`Generated manifest.json with ${files.length} files`);
