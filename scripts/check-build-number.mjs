#!/usr/bin/env node
/**
 * check-build-number — refuse to publish a build number that any earlier
 * artifact already consumed, on either platform.
 *
 * Runs before every path that consumes a number: full and single-platform
 * releases (build.yml prepare), TestFlight dev uploads (build-ios.yml), and
 * local TestFlight uploads (the ios-release skill). The number must be
 * strictly greater than every release tag on origin and, when `--asc-max` is
 * given, every build already uploaded to App Store Connect.
 *
 * Usage:
 *   node scripts/check-build-number.mjs [--root <repo>] [--build N]
 *     [--ignore-tag <tag>] [--asc-max N] [--require-origin]
 *   npm run release:check-build
 *
 * --build defaults to app.json's counter. --ignore-tag skips the tag of the
 * release being validated, so a re-run for a tag that already points at the
 * same commit is not reported as a collision.
 */
import { appendFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildFromTag, highestBuildInTags, listReleaseTags } from './build-counter.mjs';

function fail(message) {
  console.error(`Build number check failed: ${message}`);
  process.exit(1);
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith('--')) fail(`${name} requires a value`);
  return value;
}

function parseCount(name, text) {
  if (!/^\d+$/.test(text)) fail(`${name} must be a non-negative integer, got "${text}"`);
  const value = Number(text);
  if (!Number.isSafeInteger(value)) fail(`${name} is out of range: ${text}`);
  return value;
}

const root = resolve(argValue('--root') ?? resolve(import.meta.dirname, '..'));
const ignoreTag = argValue('--ignore-tag');
const ascMaxText = argValue('--asc-max');
const buildText = argValue('--build');
const requireOrigin = process.argv.includes('--require-origin');

let build;
if (buildText !== undefined && buildText !== '') {
  build = parseCount('--build', buildText);
} else {
  let app;
  try {
    app = JSON.parse(readFileSync(resolve(root, 'app.json'), 'utf8'));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    fail(`cannot read app.json: ${detail}`);
  }
  const androidBuild = Number(app.expo?.android?.versionCode);
  const iosBuild = Number(app.expo?.ios?.buildNumber);
  if (!Number.isSafeInteger(androidBuild) || androidBuild !== iosBuild) {
    fail('app.json Android versionCode and iOS buildNumber must be the same integer');
  }
  build = androidBuild;
}
if (build <= 0) fail('the build number must be positive');

let tagLedger;
try {
  tagLedger = listReleaseTags(root, { requireOrigin });
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
const tags = tagLedger.tags.filter((tag) => tag !== ignoreTag);
const highestTag = highestBuildInTags(tags);
const highestTagName = tags.find((tag) => buildFromTag(tag) === highestTag);
const ascMax = ascMaxText === undefined || ascMaxText === '' ? null : parseCount('--asc-max', ascMaxText);

const collisions = [];
if (highestTag >= build) {
  collisions.push(`release tag ${highestTagName} (${tagLedger.source}) already used build ${highestTag}`);
}
if (ascMax !== null && ascMax >= build) {
  collisions.push(`App Store Connect already has build ${ascMax}`);
}

if (collisions.length > 0) {
  const highestUsed = Math.max(highestTag, ascMax ?? 0);
  fail(
    `build ${build} is not newer than every consumed build number.\n` +
      collisions.map((line) => `  - ${line}`).join('\n') +
      `\nRun \`npm run release:build -- --after ${highestUsed}\` (or release:alpha / release:version` +
      ' with the same flag), update the CHANGES tags, commit, and push before publishing.'
  );
}

const sources = [`tags: ${tagLedger.source}, highest ${highestTag}`];
sources.push(ascMax === null ? 'App Store Connect: not checked' : `App Store Connect: highest ${ascMax}`);
console.log(`build ${build} is unused (${sources.join('; ')})`);
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `build=${build}\n`);
}
