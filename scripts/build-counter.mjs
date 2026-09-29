/**
 * build-counter — the one monotonic build counter shared by iOS and Android.
 *
 * Every published artifact consumes a number: two-platform releases,
 * Android-only releases, iOS-only releases, and TestFlight dev builds. A
 * number that one platform used is never reused by the other, so a single
 * platform may skip numbers (Android 187 -> 189 when 188 was iOS-only).
 *
 * Consumed numbers are read from two ledgers:
 *   - release tags on origin (`vX.Y.Z.B`, `vX.Y.Z.B-alpha.N`, legacy
 *     `vX.Y.Z.B-betaN`) — every release, whatever its platforms, is tagged;
 *   - App Store Connect builds — TestFlight dev uploads are not tagged, so
 *     callers that have ASC credentials pass the highest uploaded build in.
 */
import { execFileSync } from 'node:child_process';

const RELEASE_TAG = /^v\d+\.\d+\.\d+\.(\d+)(?:-alpha\.\d+|-beta\d+)?$/;

/** The build counter carried by a release tag, or null for any other ref. */
export function buildFromTag(tag) {
  const match = RELEASE_TAG.exec(tag);
  return match ? Number(match[1]) : null;
}

/** The highest build counter among the given tag names (0 when none). */
export function highestBuildInTags(tags) {
  let highest = 0;
  for (const tag of tags) {
    const build = buildFromTag(tag);
    if (build !== null && build > highest) highest = build;
  }
  return highest;
}

function git(cwd, args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
}

/**
 * Release tag names, preferring origin so tags created by CI are seen even
 * when they were never fetched. `source` is 'origin', 'local', or 'none'.
 * With `requireOrigin`, a failed origin lookup throws instead of degrading.
 */
export function listReleaseTags(cwd, { requireOrigin = false } = {}) {
  try {
    const output = git(cwd, ['ls-remote', '--tags', '--refs', 'origin']);
    const tags = output
      .split('\n')
      .map((line) => line.split('\t')[1] ?? '')
      .filter((ref) => ref.startsWith('refs/tags/'))
      .map((ref) => ref.slice('refs/tags/'.length));
    return { tags, source: 'origin' };
  } catch (error) {
    if (requireOrigin) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`could not list release tags on origin: ${detail}`);
    }
  }
  try {
    return { tags: git(cwd, ['tag', '--list']).split('\n').filter(Boolean), source: 'local' };
  } catch {
    return { tags: [], source: 'none' };
  }
}
