import fs from 'fs';
import path from 'path';

describe('Codex plugin manifest', () => {
  it('should exist and be valid JSON', () => {
    const manifestPath = path.join(__dirname, '../.codex-plugin/plugin.json');
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest).toHaveProperty('name');
    expect(manifest).toHaveProperty('version');
    expect(manifest).toHaveProperty('description');
  });
});
