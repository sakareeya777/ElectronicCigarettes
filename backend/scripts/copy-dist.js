const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

async function copyDir(src, dest) {
  await fsp.mkdir(dest, { recursive: true });
  const entries = await fsp.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const srcPath = path.join(src, e.name);
    const destPath = path.join(dest, e.name);
    if (e.isDirectory()) await copyDir(srcPath, destPath);
    else await fsp.copyFile(srcPath, destPath);
  }
}

(async () => {
  try {
    const repoRoot = path.join(__dirname, '..', '..');
    const candidates = [
      path.join(repoRoot, 'dist'),
      path.join(repoRoot, 'web-build'),
      path.join(repoRoot, 'public')
    ];

    let found = null;
    for (const c of candidates) {
      try {
        if (fs.existsSync(c)) { found = c; break; }
      } catch (e) {
        // ignore
      }
    }

    const out = path.join(__dirname, '..', 'public');

    if (!found) {
      console.log('No frontend build found at ../dist or ../web-build. Skipping copy.');
      process.exit(0);
    }

    console.log('Copying frontend from', found, 'to', out);
    await copyDir(found, out);
    console.log('Frontend copy complete.');
  } catch (err) {
    console.error('Failed to copy frontend build:', err && err.message);
    process.exit(1);
  }
})();
