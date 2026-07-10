// src/api.js
// ─────────────────────────────────────────────────────────────────────────────
// Live scores:
//   Soccer (EPL, UCL, World Cup) → API-Football (api-sports.io), v3
//   NBA/NFL/NHL → not active
// ─────────────────────────────────────────────────────────────────────────────

const axios  = require("axios");
const config = require("./config");

// ── Client ────────────────────────────────────────────────────────────────────

const apiFootball = axios.create({
  baseURL: "https://v3.football.api-sports.io",
  headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY },
  timeout: 15000,
});

// ── League map (single source of truth in config.js) ─────────────────────────
// API-Football league IDs — different scheme to the old football-data.org codes
// and to the old (unused) TheSportsDB ids: EPL=39, UCL=2, World Cup=1.

const AF_LEAGUES = Object.fromEntries(
  config.leagues.soccer.map((l) => [l.id, { name: l.name, tag: l.tag }])
);
const AF_LEAGUE_IDS = config.leagues.soccer.map((l) => l.id);

// ── Status buckets ────────────────────────────────────────────────────────────
// Real status codes from the API, so no more "kickoff + 115 min" guessing.

const LIVE_STATUSES     = ["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"];
const FINISHED_STATUSES = ["FT", "AET", "PEN"];

// ── Shared fetch helper with exponential backoff ──────────────────────────────
// API-Football can rate-limit two ways: a genuine HTTP 429, or a 200 response
// with `errors.rateLimit` set in the body. We handle both.

async function afGet(path, params, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res    = await apiFootball.get(path, { params });
      const errors = res.data?.errors;
      const hasErrors = errors && (Array.isArray(errors) ? errors.length : Object.keys(errors).length);

      if (hasErrors) {
        if (errors.rateLimit) {
          const isLast = attempt === retries;
          console.warn(`⏳ Rate limited by API-Football (soft) — backing off`);
          if (isLast) throw new Error(errors.rateLimit);
          await sleep(Math.pow(2, attempt + 1) * 1000);
          continue;
        }
        // Non rate-limit API errors (bad params etc) — log, return as-is
        console.error(`❌ afGet ${path} API error:`, JSON.stringify(errors));
      }

      return res.data;
    } catch (e) {
      const isLast = attempt === retries;
      const code   = e.response?.status;

      // 429 = hard rate limited — back off per Retry-After if present
      if (code === 429) {
        const retryAfter = Number(e.response?.headers?.["retry-after"] ?? 60);
        console.warn(`⏳ Rate limited (429) by API-Football — waiting ${retryAfter}s`);
        await sleep(retryAfter * 1000);
        continue;
      }

      console.error(`❌ afGet ${path} (attempt ${attempt + 1}/${retries + 1}): ${e.message}`);
      if (isLast) throw e;

      // Exponential backoff: 1s, 2s
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }
}

// ── Soccer Live Scores ────────────────────────────────────────────────────────
// One call covers all three leagues at once via the hyphen-joined `live` param.

async function getLiveSoccerFixtures() {
  try {
    // "live" must be "all" or a multi-id hyphenated list ("id-id-id"); a
    // single league id (e.g. "1") fails API-Football's regex validation.
    // Safer to always request "all" and filter to our leagues client-side —
    // same pattern already used in getRecentlyFinishedSoccer / getTodaySoccerFixtures.
    const data = await afGet("/fixtures", { live: "all" });
    return (data?.response ?? []).filter((m) => AF_LEAGUE_IDS.includes(m.league?.id));
  } catch {
    return [];
  }
}
// ── Recently Finished Soccer Matches ─────────────────────────────────────────
// Status is authoritative now (FT/AET/PEN), so no more approximation — we just
// pull today's + yesterday's date (covers matches that started before midnight
// UTC and finished after) and filter to our leagues + finished statuses.
// The existing db dedup (soccer-ft-{id}) means re-fetching yesterday is cheap
// and harmless — already-posted results get skipped.

async function getRecentlyFinishedSoccer() {
  try {
    const today     = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const dates     = [today, yesterday].map((d) => d.toISOString().slice(0, 10));

    const results = await Promise.all(
      dates.map((date) =>
        afGet("/fixtures", { date, status: FINISHED_STATUSES.join("-") })
      )
    );

    return results
      .flatMap((data) => data?.response ?? [])
      .filter((m) => AF_LEAGUE_IDS.includes(m.league?.id));
  } catch {
    return [];
  }
}

// ── Today's Soccer Fixtures ───────────────────────────────────────────────────

async function getTodaySoccerFixtures() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const data  = await afGet("/fixtures", { date: today });
    return (data?.response ?? []).filter((m) => AF_LEAGUE_IDS.includes(m.league?.id));
  } catch {
    return [];
  }
}

// ── Latest goal scorer from a fixture's events array ─────────────────────────
// The live `/fixtures?live=...` response includes an `events` array per fixture.
// We take the most recent "Goal" event — this lines up with the scoreline that
// just triggered the dedup key change in jobs.js.

function extractLatestScorer(fixture) {
  const events = fixture.events;
  if (!Array.isArray(events) || events.length === 0) return null;

  const goals = events.filter((e) => e.type === "Goal");
  if (goals.length === 0) return null;

  const last = goals[goals.length - 1];
  return last.player?.name ?? null;
}

// ── Normalise API-Football fixture → internal shape ───────────────────────────

function normaliseAFMatch(m) {
  const league = AF_LEAGUES[m.league?.id] ?? {
    name: m.league?.name ?? "",
    tag:  "#Football",
  };

  const status = m.fixture?.status?.short;

  return {
    id:            m.fixture?.id,
    home_team:     m.teams?.home?.name ?? "",
    away_team:     m.teams?.away?.name ?? "",
    home_score:    m.goals?.home ?? 0,
    away_score:    m.goals?.away ?? 0,
    penalty_home:  m.score?.penalty?.home ?? null,
    penalty_away:  m.score?.penalty?.away ?? null,
    status,
    minute:        m.fixture?.status?.elapsed ?? null,
    league_name:   league.name,
    league_tag:    league.tag,
    kickoff_utc:   (m.fixture?.timestamp ?? 0) * 1000,
    is_live:       LIVE_STATUSES.includes(status),
    is_final:      FINISHED_STATUSES.includes(status),
    scorer:        extractLatestScorer(m),
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function currentSeason() {
  const now = new Date();
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
}

module.exports = {
  getLiveSoccerFixtures,
  getRecentlyFinishedSoccer,
  getTodaySoccerFixtures,
  normaliseAFMatch,
  sleep,
  currentSeason,
};