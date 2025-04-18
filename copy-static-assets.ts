// copy-static-assets.ts
import fs from 'fs';
import path from 'path';

const src = path.resolve(__dirname,'src', 'public');
const dest = path.resolve(__dirname, 'dist','src', 'public');

function copyDir(srcDir: string, destDir: string) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDir(src, dest);
console.log('✅ Static files copied to dist/public');
