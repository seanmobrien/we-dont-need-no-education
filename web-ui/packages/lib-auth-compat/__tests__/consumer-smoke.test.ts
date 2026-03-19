import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const fixtureDir = join(__dirname, 'fixtures', 'consumer-smoke');
const fixturePackageJson = JSON.parse(
  readFileSync(join(fixtureDir, 'package.json'), 'utf8'),
) as { dependencies?: Record<string, string> };

const [spawnCmd, spawnArgs] =
  process.platform === 'win32'
    ? (['cmd', ['/c', 'yarn', 'tsc', '--noEmit']] as const)
    : (['yarn', ['tsc', '--noEmit']] as const);

describe('consumer smoke compile', () => {
  it('compiles a consumer fixture that only depends on auth-compat (no next-auth peer)', () => {
    expect(fixturePackageJson.dependencies ?? {}).not.toHaveProperty('next-auth');
    expect(fixturePackageJson.dependencies ?? {}).not.toHaveProperty('@auth/core');
    expect(fixturePackageJson.dependencies ?? {}).not.toHaveProperty(
      '@auth/drizzle-adapter',
    );

    const result = spawnSync(
      spawnCmd,
      [...spawnArgs, '-p', join(fixtureDir, 'tsconfig.json')],
      {
        cwd: join(fixtureDir, '..', '..', '..', '..', '..'),
        encoding: 'utf8',
      },
    );

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });
});
