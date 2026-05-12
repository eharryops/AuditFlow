import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const output = fs.createWriteStream(path.join(__dirname, 'infrastructure/terraform/.terraform/lambda-build.zip'));
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => console.log(`Lambda zip created (${archive.pointer()} bytes)`));
archive.on('error', (err) => { throw err; });

archive.pipe(output);

// Add backend directory but exclude node_modules
archive.directory(path.join(__dirname, 'backend/'), false, (entry) => {
  if (entry.name.includes('node_modules')) return false;
  if (entry.name.includes('.git')) return false;
  if (entry.name.endsWith('.zip')) return false;
  return entry;
});

archive.finalize();
