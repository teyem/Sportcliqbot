// src/db.js — in-memory cache with periodic flush (no race conditions)
const fs   = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "../data/bot.json");

// ── In-memory state (loaded once at startup) ──────────────────────────────────

let _cache = null;
let _dirty = false;

function getCache() {
  if (!_cache) {
    try {
      _cache = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    } catch {
      _cache = { events: {}, news: {}, fixtures: {} };
    }
  }
  return _cache;
}

/** Flush to disk only if something changed */
function flush() {
  if (!_dirty) return;
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(getCache(), null, 2));
    _dirty = false;
  } catch (e) {
    console.error("❌ db flush error:", e.message);
  }
}

// Auto-flush every 10 seconds so we never lose more than 10s of state
setInterval(flush, 10_000).unref();

// Flush on clean shutdown
process.on("exit", flush);
process.on("SIGINT",  () => { flush(); process.exit(0); });
process.on("SIGTERM", () => { flush(); process.exit(0); });

// ── Posted events ─────────────────────────────────────────────────────────────

function hasPosted(id) {
  return !!getCache().events[id];
}

function markPosted(id, type) {
  getCache().events[id] = { type, posted_at: Date.now() };
  _dirty = true;
}

// ── Posted news ───────────────────────────────────────────────────────────────

function hasPostedNews(url) {
  return !!getCache().news[url];
}

function markPostedNews(url) {
  getCache().news[url] = { posted_at: Date.now() };
  _dirty = true;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

function upsertFixture(f) {
  const cache    = getCache();
  const existing = cache.fixtures[f.fixture_id] ?? {};
  cache.fixtures[f.fixture_id] = {
    ...existing,
    ...f,
    prematch_sent: existing.prematch_sent ?? 0,
  };
  _dirty = true;
}

function getUpcomingFixtures(windowMs) {
  const now    = Date.now();
  const cutoff = now + windowMs;
  return Object.values(getCache().fixtures).filter(
    (f) =>
      f.prematch_sent === 0 &&
      f.status        === "NS" &&
      f.kickoff_utc   >  now  &&
      f.kickoff_utc   <= cutoff
  );
}

function markPrematchSent(fixtureId) {
  const cache = getCache();
  if (cache.fixtures[fixtureId]) {
    cache.fixtures[fixtureId].prematch_sent = 1;
    _dirty = true;
  }
}

// ── Cleanup (entries older than 7 days) ───────────────────────────────────────

function cleanup() {
  const cache     = getCache();
  const threshold = Date.now() - 7 * 24 * 60 * 60 * 1000;

  for (const [k, v] of Object.entries(cache.events)) {
    if (v.posted_at < threshold) delete cache.events[k];
  }
  for (const [k, v] of Object.entries(cache.news)) {
    if (v.posted_at < threshold) delete cache.news[k];
  }

  _dirty = true;
  flush(); // force immediate flush after cleanup
  console.log("🧹 DB cleanup done");
}

module.exports = {
  flush,
  hasPosted, markPosted,
  hasPostedNews, markPostedNews,
  upsertFixture, getUpcomingFixtures, markPrematchSent,
  cleanup,
};