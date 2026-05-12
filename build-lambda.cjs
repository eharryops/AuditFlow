const fs = require('fs');
const path = require('path');
const Archiver = require('archiver');

const backendDir = path.join(__dirname, 'backend');
const outputZip = path.join(__dirname, 'infrastructure/terraform/.terraform/lambda-build.zip');

// Ensure output directory exists
const outputDir = path.dirname(outputZip);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const output = fs.createWriteStream(outputZip);
const archive = Archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`Lambda zip created: ${outputZip} (${archive.pointer()} bytes)`);
});

archive.on('error', (err) => {
  console.error('Archive error:', err);
  process.exit(1);
});

archive.pipe(output);

// Add files, excluding node_modules and other unnecessary files
const dir = fs.opendirSync(backendDir);
let dirent;
while ((dirent = dir.readSync()) !== null) {
  if (dirent.name === 'node_modules' || dirent.name === '.git' || dirent.name.endsWith('.zip')) {
    continue;
  }
  const fullPath = path.join(backendDir, dirent.name);
  if (dirent.isDirectory()) {
    archive.directory(fullPath, dirent.name);
  } else {
    archive.file(fullPath, { name: dirent.name });
  }
}
dir.closeSync();

archive.finalize();
