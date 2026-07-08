import fs from 'node:fs';
import path from 'node:path';

const IMPORT_RE = /(\bfrom\s+)(["'])(\.[^"']*)\.ts\2/g;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(p);
    } else if (entry.name.endsWith('.ts')) {
      const before = fs.readFileSync(p, 'utf8');
      const after = before.replace(IMPORT_RE, '$1$2$3$2');
      if (before !== after) fs.writeFileSync(p, after);
    }
  }
}

const target = process.argv[2] || 'src/generated/prisma';
walk(target);
