
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.resolve(__dirname, '../node_modules/@wllama/wllama/esm');
const targetDir = path.resolve(__dirname, '../public/wllama');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Copy single-thread wasm
fs.copyFileSync(
  path.join(sourceDir, 'single-thread/wllama.wasm'),
  path.join(targetDir, 'wllama-single.wasm')
);

// Copy multi-thread wasm
fs.copyFileSync(
  path.join(sourceDir, 'multi-thread/wllama.wasm'),
  path.join(targetDir, 'wllama-multi.wasm')
);

console.log('Wllama assets copied to public/wllama');
