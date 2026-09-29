/// <reference types="node" />
/// <reference types="jest" />

import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const projectRoot = join(__dirname, '..', '..');
const localGitEnvironmentKeys = execFileSync('git', ['rev-parse', '--local-env-vars'], {
  encoding: 'utf8',
})
  .trim()
  .split('\n');

function isolatedGitEnvironment(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const key of localGitEnvironmentKeys) delete env[key];
  delete env.GITHUB_OUTPUT;
  return env;
}

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, {
    cwd,
    env: isolatedGitEnvironment(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

/**
 * A clone whose origin carries `remoteTags`. The tags are never fetched into
 * the clone, like a checkout that predates a CI-created release tag.
 */
function createRepository(build: number, remoteTags: string[]) {
  const root = mkdtempSync(join(tmpdir(), 'uniclip-build-counter-'));
  const remote = join(root, 'remote.git');
  const seed = join(root, 'seed');
  const work = join(root, 'work');

  git(root, 'init', '--bare', remote);
  git(root, 'init', seed);
  git(seed, 'config', 'user.name', 'Release Test');
  git(seed, 'config', 'user.email', 'release-test@example.com');
  writeFileSync(join(seed, 'release.txt'), 'first\n');
  git(seed, 'add', 'release.txt');
  git(seed, 'commit', '-m', 'first');
  git(seed, 'branch', '-M', 'main');
  git(seed, 'remote', 'add', 'origin', remote);
  git(seed, 'push', '-u', 'origin', 'main');
  git(root, 'clone', '--no-tags', '--branch', 'main', remote, work);
  for (const tag of remoteTags) {
    git(seed, 'tag', tag);
    git(seed, 'push', 'origin', `refs/tags/${tag}`);
  }

  mkdirSync(join(work, 'scripts'));
  for (const script of [
    'build-counter.mjs',
    'bump-build.mjs',
    'bump-version.mjs',
    'check-build-number.mjs',
  ]) {
    copyFileSync(join(projectRoot, 'scripts', script), join(work, 'scripts', script));
  }
  writeFileSync(
    join(work, 'app.json'),
    `${JSON.stringify(
      {
        expo: {
          version: '1.3.0',
          ios: { buildNumber: String(build) },
          android: { versionCode: build },
        },
      },
      null,
      2
    )}\n`
  );
  return { root, work };
}

function runScript(work: string, script: string, ...args: string[]) {
  return spawnSync(process.execPath, [join(work, 'scripts', script), ...args], {
    cwd: work,
    env: isolatedGitEnvironment(),
    encoding: 'utf8',
  });
}

function readBuild(work: string) {
  const app = JSON.parse(readFileSync(join(work, 'app.json'), 'utf8'));
  return { android: app.expo.android.versionCode, ios: app.expo.ios.buildNumber };
}

describe('shared build counter', () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  function repository(build: number, remoteTags: string[]) {
    const repo = createRepository(build, remoteTags);
    roots.push(repo.root);
    return repo.work;
  }

  it('bumps past a build that a single-platform release tagged on origin', () => {
    // 187 shipped iOS-only from another checkout; app.json here still says 186.
    const work = repository(186, ['v1.3.0.186', 'v1.3.0.187']);

    const result = runScript(work, 'bump-build.mjs');

    expect(result.status).toBe(0);
    expect(readBuild(work)).toEqual({ android: 188, ios: '188' });
  });

  it('bumps an Alpha past tagged Alpha builds as well', () => {
    const work = repository(186, ['v1.3.0.189-alpha.3']);

    expect(runScript(work, 'bump-build.mjs', '--alpha').status).toBe(0);
    expect(readBuild(work)).toEqual({ android: 190, ios: '190' });
  });

  it('bumps past an untagged number reported with --after', () => {
    const work = repository(186, ['v1.3.0.186']);

    expect(runScript(work, 'bump-build.mjs', '--after', '191').status).toBe(0);
    expect(readBuild(work)).toEqual({ android: 192, ios: '192' });
  });

  it('keeps the counter climbing across a marketing-version bump', () => {
    const work = repository(186, ['v1.3.0.188']);

    expect(runScript(work, 'bump-version.mjs', '1.4.0', '--after', '189').status).toBe(0);
    const app = JSON.parse(readFileSync(join(work, 'app.json'), 'utf8'));
    expect(app.expo.version).toBe('1.4.0');
    expect(readBuild(work)).toEqual({ android: 190, ios: '190' });
  });

  it('accepts a build newer than every tag and App Store Connect build', () => {
    const work = repository(188, ['v1.3.0.186', 'v1.3.0.187-alpha.2']);

    const result = runScript(work, 'check-build-number.mjs', '--require-origin', '--asc-max', '187');

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('build 188 is unused');
  });

  it('rejects a build that a release tag on origin already used', () => {
    const work = repository(187, ['v1.3.0.187']);

    const result = runScript(work, 'check-build-number.mjs', '--require-origin');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('release tag v1.3.0.187 (origin) already used build 187');
    expect(result.stderr).toContain('npm run release:build -- --after 187');
  });

  it('rejects a build that a TestFlight dev upload already used', () => {
    const work = repository(188, ['v1.3.0.187']);

    const result = runScript(work, 'check-build-number.mjs', '--asc-max', '189');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('App Store Connect already has build 189');
    expect(result.stderr).toContain('--after 189');
  });

  it('ignores the tag of the release being re-run', () => {
    const work = repository(188, ['v1.3.0.187', 'v1.3.0.188']);

    const result = runScript(work, 'check-build-number.mjs', '--ignore-tag', 'v1.3.0.188');

    expect(result.status).toBe(0);
  });

  it('checks an explicit dev-build override instead of app.json', () => {
    const work = repository(186, ['v1.3.0.187']);

    expect(runScript(work, 'check-build-number.mjs', '--build', '190').status).toBe(0);
    expect(runScript(work, 'check-build-number.mjs', '--build', '187').status).toBe(1);
  });

  it('fails instead of guessing when origin is required but unreachable', () => {
    const work = repository(188, []);
    git(work, 'remote', 'set-url', 'origin', join(work, 'missing.git'));

    const result = runScript(work, 'check-build-number.mjs', '--require-origin');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('could not list release tags on origin');
  });
});
