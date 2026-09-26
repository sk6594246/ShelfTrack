/**
 * MU-03 live write-through
 * - Pull snapshot when session starts
 * - Debounced push of local ops data (docs, batches, products mirror) to D1
 * - Immediate flush after post/reverse document
 */

import { isD1Enabled, d1GetProducts, d1PushSnapshot } from './d1Api';
import { getSession } from './syncConfig';
import {
  collectLocalSnapshot,
  pullFromDb,
  type FullSnapshot,
} from './fullSync';

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let inflight: Promise<void> | null = null;
let dirty = false;
let lastPullAt = 0;

const DEBOUNCE_MS = 700;
const PULL_COOLDOWN_MS = 5000;

/** Mark local state dirty and schedule a background push. */
export function scheduleWriteThrough(_reason?: string): void {
  if (!isD1Enabled() || !getSession()) return;
  dirty = true;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void flushWriteThrough();
  }, DEBOUNCE_MS);
}

/** Push now (e.g. after post document). Safe to call often. */
export async function flushWriteThrough(): Promise<void> {
  if (!isD1Enabled() || !getSession()) return;
  if (inflight) return inflight;

  dirty = false;
  inflight = (async () => {
    try {
      await pushToDbSafe();
      try {
        window.dispatchEvent(new CustomEvent('st-sync-ok', { detail: { at: Date.now() } }));
      } catch {
        /* ignore */
      }
    } catch (e) {
      dirty = true;
      console.warn('[liveSync] write-through failed', e);
      try {
        window.dispatchEvent(
          new CustomEvent('st-sync-error', {
            detail: e instanceof Error ? e.message : String(e),
          })
        );
      } catch {
        /* ignore */
      }
    } finally {
      inflight = null;
      if (dirty) scheduleWriteThrough('retry');
    }
  })();
  return inflight;
}

/** Pull remote → local once per session window (cooldown). */
export async function pullOnSession(force = false): Promise<void> {
  if (!isD1Enabled() || !getSession()) return;
  const now = Date.now();
  if (!force && now - lastPullAt < PULL_COOLDOWN_MS) return;
  lastPullAt = now;
  try {
    await pullFromDb();
    try {
      window.dispatchEvent(new CustomEvent('st-sync-pulled', { detail: { at: now } }));
    } catch {
      /* ignore */
    }
  } catch (e) {
    console.warn('[liveSync] pull failed', e);
  }
}

/**
 * Push local snapshot without wiping remote products when local product cache is empty
 * (D1 mode often keeps products only via gasGetProducts).
 */
export async function pushToDbSafe(): Promise<void> {
  if (!isD1Enabled()) throw new Error('D1 not configured');
  const snap = collectLocalSnapshot() as FullSnapshot & Record<string, unknown>;

  if (!snap.products || (Array.isArray(snap.products) && snap.products.length === 0)) {
    try {
      const remote = await d1GetProducts();
      if (remote?.length) {
        snap.products = remote as FullSnapshot['products'];
      }
    } catch {
      /* keep local empty products */
    }
  }

  await d1PushSnapshot(snap as unknown as Record<string, unknown>);
}

/** Force immediate push after posting/reversing a document. */
export async function writeThroughAfterPost(): Promise<void> {
  dirty = true;
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  await flushWriteThrough();
}
