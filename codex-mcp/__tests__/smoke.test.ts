import fs from 'fs';
import path from 'path';

describe('Codex plugin manifest', () => {
  it('should exist and be valid JSON', () => {
    const manifestPath = path.join(__dirname, '../src/.codex-plugin/plugin.json');
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest).toHaveProperty('name');
    expect(manifest).toHaveProperty('version');
    expect(manifest).toHaveProperty('description');
    expect(Array.isArray(manifest.settings)).toBe(true);

    const settingNames = manifest.settings.map((setting: { name: string }) => setting.name);
    expect(settingNames).toEqual([
      'clientSecret',
      'logFile',
      'neo4jUri',
      'neo4jUsername',
      'neo4jPassword',
      'neo4jDatabase',
      'neo4jAutoDiscovery',
    ]);
  });
});
