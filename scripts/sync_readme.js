const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(repoRoot, 'profile', 'README.md');
const targetPath = path.join(repoRoot, 'README.md');

function syncReadme() {
  if (!fs.existsSync(sourcePath)) {
    console.error(`Source file not found: ${sourcePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(sourcePath, 'utf8');
  fs.writeFileSync(targetPath, content, 'utf8');
  console.log(`Successfully synced README.md from ${sourcePath} -> ${targetPath}`);
}

syncReadme();
