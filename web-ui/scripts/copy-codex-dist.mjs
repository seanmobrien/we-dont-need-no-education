// Copy codex-mcp build output and manifest to a publishable folder
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../packages/codex-mcp');
const dist = path.join(root, 'dist');
const publish = path.join(root, 'publish');
const manifest = path.join(root, '.codex-plugin');
const scripts = path.join(root, 'scripts');

async function main() {
  await fs.rm(publish, { recursive: true, force: true });
  await fs.mkdir(publish, { recursive: true });
  // Copy dist
  await fs.cp(dist, path.join(publish, 'dist'), { recursive: true });
  // Copy manifest
  await fs.cp(manifest, path.join(publish, '.codex-plugin'), { recursive: true });
  // Copy scripts
  await fs.cp(scripts, path.join(publish, 'scripts'), { recursive: true });
  console.log('Codex plugin published to', publish);
}

main().catch(e => { console.error(e); process.exit(1); });
