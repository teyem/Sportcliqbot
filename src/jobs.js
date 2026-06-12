// src/jobs.js
// ─────────────────────────────────────────────────────────────────────────────
// Active jobs:   Soccer (EPL, UCL, World Cup), News, Pre-match, Daily fixtures
// Commented out: NBA, NFL, NHL
// ─────────────────────────────────────────────────────────────────────────────

const Parser = require("rss-parser");
const config = require("./config");
const api    = require("./api");
const db     = require("./db");
const fmt    = require("./formatter");

const rss = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/rss+xml, application/xml, text/xml, */*",
  },
});

// ── Sender helper ─────────────────────────────────────────────────────────────

let _bot, _channelId;

function init(bot, channelId) {
  _bot       = bot;
  _channelId = channelId;
}

async function send(message) {
  try {
    await _bot.sendMessage(_channelId, message, {
      parse_mode: "MarkdownV2",
      disable_web_page_preview: true,
    });
    // Small delay between messages so Telegram doesn't rate-limit the bot
    await sleep(1500);
  } catch (e) {
    console.error("❌ Telegram send error:", e.message);
  }
}

// ── Job 1: Live soccer scores + full-time results ─────────────────────────────
//
// Two API calls per tick:
//   1. GET /matches?status=IN_PLAY,PAUSED  → goal alerts
//   2. GET /matches?status=FINISHED        → full-time alerts
//
// Deduplication keys:
//   Goal:  soccer-live-{id}-{home}-{away}   (unique per scoreline)
//   HT:    soccer-ht-{id}                   (one alert per half-time)
//   FT:    soccer-ft-{id}                   (one alert per match)

async function jobLiveSoccer() {
  // ── 1. Live / in-play: goal alerts ───────────────────────────────────────
  const liveMatches = await api.getLiveSoccerFixtures();

  for (const m of liveMatches) {
    const f          = api.normaliseFDMatch(m);
    const totalGoals = (f.home_score ?? 0) + (f.away_score ?? 0);

    // Skip 0-0 — nothing to report yet
    if (totalGoals === 0) continue;

    // Unique key per scoreline — fires once per goal, never twice
    const goalKey = `soccer-live-${f.id}-${f.home_score}-${f.away_score}`;
    if (db.hasPosted(goalKey)) continue;

    const msg = fmt.soccerGoal({
      home:       f.home_team,
      away:       f.away_team,
      homeScore:  f.home_score,
      awayScore:  f.away_score,
      scorer:     null, // football-data.org free tier doesn't include scorer
      minute:     f.minute ?? "",
      leagueTag:  f.league_tag,
    });

    if (msg) {
      await send(msg);
      db.markPosted(goalKey, "soccer-live");
      console.log(`⚽ Goal: ${f.home_team} ${f.home_score}-${f.away_score} ${f.away_team} (${f.minute ?? "?"}′)`);
    }
  }

  // ── 2. Half-time alerts ───────────────────────────────────────────────────
  // PAUSED status = half time on football-data.org
  for (const m of liveMatches) {
    const f = api.normaliseFDMatch(m);
    if (f.status !== "PAUSED") continue;

    const htKey = `soccer-ht-${f.id}`;
    if (db.hasPosted(htKey)) continue;

    const msg = fmt.soccerHalfTime({
      home:      f.home_team,
      away:      f.away_team,
      homeScore: f.home_score,
      awayScore: f.away_score,
      leagueTag: f.league_tag,
    });

    await send(msg);
    db.markPosted(htKey, "soccer-ht");
    console.log(`⏸ HT: ${f.home_team} ${f.home_score}-${f.away_score} ${f.away_team}`);
  }

  // ── 3. Full-time results ──────────────────────────────────────────────────
  const finished = await api.getRecentlyFinishedSoccer();

  for (const m of finished) {
    const f   = api.normaliseFDMatch(m);
    const key = `soccer-ft-${f.id}`;
    if (db.hasPosted(key)) continue;

    const msg = fmt.soccerFinalResult({
      home:       f.home_team,
      away:       f.away_team,
      homeScore:  f.home_score,
      awayScore:  f.away_score,
      leagueName: f.league_name,
      leagueTag:  f.league_tag,
    });

    await send(msg);
    db.markPosted(key, "soccer-ft");
    console.log(`🏁 FT: ${f.home_team} ${f.home_score}-${f.away_score} ${f.away_team}`);
  }
}

// ── Job 5: Sports news (Google News RSS) ─────────────────────────────────────

let newsFeedIndex = 0;

async function jobNews() {
  const feed = config.newsFeeds[newsFeedIndex];
  newsFeedIndex = (newsFeedIndex + 1) % config.newsFeeds.length;

  try {
    const parsed = await rss.parseURL(feed.url);
    const items  = (parsed.items ?? []).slice(0, 10);

    for (const item of items) {
      const url = item.link;
      if (!url || db.hasPostedNews(url)) continue;

      const text     = `${item.title ?? ""} ${item.contentSnippet ?? ""}`.toLowerCase();
      const relevant = config.newsKeywords.some((kw) => text.includes(kw));
      if (!relevant) continue;

      const msg = fmt.newsArticle({
        title:  item.title ?? "Sports update",
        source: feed.name,
        url,
      });

      await send(msg);
      db.markPostedNews(url);
      console.log(`📰 News [${feed.name}]: ${item.title?.slice(0, 60)}`);
      break;
    }
  } catch (e) {
    console.error(`❌ RSS error (${feed.name}):`, e.message);
  }
}

// ── Job 6: Pre-match alerts ───────────────────────────────────────────────────

async function jobPreMatch() {
  const hoursAhead = Number(process.env.PREMATCH_HOURS_BEFORE ?? 1);
  const windowMs   = hoursAhead * 60 * 60 * 1000;
  const upcoming   = db.getUpcomingFixtures(windowMs);

  for (const f of upcoming) {
    const kickoff = fmt.formatTime(f.kickoff_utc);
    let msg;

    if (f.sport === "soccer") {
      msg = fmt.soccerPreMatch({
        home:       f.home_team,
        away:       f.away_team,
        kickoff,
        leagueName: f.league_name ?? "",
        leagueTag:  f.league_tag  ?? "\\#Football",
      });
    }

    if (msg) {
      await send(msg);
      db.markPrematchSent(f.fixture_id);
      console.log(`🕐 Pre-match: ${f.home_team} vs ${f.away_team}`);
    }
  }
}

// ── Job 7: Daily fixture fetch ────────────────────────────────────────────────

async function jobFetchDailyFixtures() {
  console.log("📅 Fetching today's fixtures...");

  const soccerMatches = await api.getTodaySoccerFixtures();
  for (const m of soccerMatches) {
    const f = api.normaliseFDMatch(m);
    db.upsertFixture({
      fixture_id:  f.id,
      sport:       "soccer",
      league_id:   m.competition?.code,
      league_name: f.league_name,
      league_tag:  f.league_tag,
      home_team:   f.home_team,
      away_team:   f.away_team,
      kickoff_utc: f.kickoff_utc,
      status:      "NS",
    });
  }

  console.log(`✅ Today's fixtures cached (${soccerMatches.length} matches)`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = {
  init,
  jobLiveSoccer,
  jobNews,
  jobPreMatch,
  jobFetchDailyFixtures,
};