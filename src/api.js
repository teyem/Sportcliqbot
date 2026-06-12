// src/api.js
// ─────────────────────────────────────────────────────────────────────────────
// Live scores:
//   Soccer  → football-data.org (EPL, UCL, World Cup only)
//   NBA/NFL/NHL → ESPN unofficial API (commented out — not active)
// ─────────────────────────────────────────────────────────────────────────────

const axios = require("axios");

// ── Clients ───────────────────────────────────────────────────────────────────

const footballData = axios.create({
  baseURL: "https://api.football-data.org/v4",
  headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_KEY },
  timeout: 15000, // reduced from 30s — fail fast and retry
});

const sportsdb = axios.create({
  baseURL: "https://www.thesportsdb.com/api/v1/json/123",
  timeout: 10000,
});

// ── Competition codes for football-data.org ───────────────────────────────────
const FD_COMPETITIONS = ["PL", "CL", "WC"];

// ── Shared fetch helper with exponential backoff ──────────────────────────────
// Keeps total API calls predictable so we never blow past 10 req/min

async function fdGet(path, params, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await footballData.get(path, { params });
      return res.data;
    } catch (e) {
      const isLast = attempt === retries;
      const code   = e.response?.status;

      // 429 = rate limited — back off hard
      if (code === 429) {
        const retryAfter = Number(e.response?.headers?.["retry-after"] ?? 60);
        console.warn(`⏳ Rate limited by football-data.org — waiting ${retryAfter}s`);
        await sleep(retryAfter * 1000);
        continue;
      }

      console.error(`❌ fdGet ${path} (attempt ${attempt + 1}/${retries + 1}): ${e.message}`);
      if (isLast) throw e;

      // Exponential backoff: 1s, 2s
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }
}

// ── Soccer Live Scores ────────────────────────────────────────────────────────

async function getLiveSoccerFixtures() {
  try {
    const data = await fdGet("/matches", { status: "IN_PLAY,PAUSED" });
    return (data.matches ?? []).filter((m) =>
      FD_COMPETITIONS.includes(m.competition?.code)
    );
  } catch {
    return [];
  }
}

// ── Recently Finished Soccer Matches ─────────────────────────────────────────
// Fetches FINISHED matches and filters to those that likely ended recently.
// We can't know exact end time from football-data.org, so we approximate:
//   kickoff + 115 minutes (90 min + avg stoppage + buffer) as the "ended after" threshold.
// This means a match kicked off up to ~115 min ago will still be caught.

async function getRecentlyFinishedSoccer() {
  try {
    const data = await fdGet("/matches", { status: "FINISHED" });
    const now  = Date.now();

    return (data.matches ?? []).filter((m) => {
      if (!FD_COMPETITIONS.includes(m.competition?.code)) return false;
      const kickoff    = new Date(m.utcDate).getTime();
      const approxEnd  = kickoff + 115 * 60 * 1000; // kickoff + ~115 min
      const threeHours = now - 3 * 60 * 60 * 1000;
      // Must have probably ended by now, and not be older than 3 hours
      return approxEnd <= now && kickoff >= threeHours;
    });
  } catch {
    return [];
  }
}

// ── Today's Soccer Fixtures ───────────────────────────────────────────────────

async function getTodaySoccerFixtures() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const data  = await fdGet("/matches", { dateFrom: today, dateTo: today });
    return (data.matches ?? []).filter((m) =>
      FD_COMPETITIONS.includes(m.competition?.code)
    );
  } catch {
    return [];
  }
}

// ── TheSportsDB — Today's fixtures ───────────────────────────────────────────

async function getTodayFixturesByLeague(leagueId) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const res   = await sportsdb.get("/eventsday.php", {
      params: { d: today, l: leagueId },
    });
    return res.data.events ?? [];
  } catch (e) {
    console.error(`❌ getTodayFixturesByLeague (${leagueId}):`, e.message);
    return [];
  }
}

// ── Normalise football-data.org match → internal shape ───────────────────────

function normaliseFDMatch(m) {
  const compMap = {
    PL:  { name: "Premier League",   tag: "#EPL"      },
    CL:  { name: "Champions League", tag: "#UCL"      },
    WC:  { name: "World Cup",        tag: "#WorldCup" },
  };
  const league = compMap[m.competition?.code] ?? {
    name: m.competition?.name ?? "",
    tag:  "#Football",
  };

  // football-data.org puts current score in fullTime during play,
  // then keeps it there after FINISHED. halfTime is only reliable at HT.
  const homeScore = m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? 0;
  const awayScore = m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? 0;

  return {
    id:          m.id,
    home_team:   m.homeTeam?.shortName ?? m.homeTeam?.name ?? "",
    away_team:   m.awayTeam?.shortName ?? m.awayTeam?.name ?? "",
    home_score:  homeScore,
    away_score:  awayScore,
    status:      m.status,
    // minute field: football-data sends this on live matches
    minute:      m.minute ?? null,
    league_name: league.name,
    league_tag:  league.tag,
    kickoff_utc: new Date(m.utcDate).getTime(),
    is_live:     m.status === "IN_PLAY" || m.status === "PAUSED",
    is_final:    m.status === "FINISHED",
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
  normaliseFDMatch,
  getTodayFixturesByLeague,
  sleep,
  currentSeason,
};