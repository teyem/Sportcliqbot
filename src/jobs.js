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
    await sleep(1500);
  } catch (e) {
    console.error("❌ Telegram send error:", e.message);
  }
}

// ── Job 1: Live soccer scores (football-data.org) ─────────────────────────────

async function jobLiveSoccer() {
  const matches = await api.getLiveSoccerFixtures();

  for (const m of matches) {
    const f   = api.normaliseFDMatch(m);
    const key = `soccer-live-${f.id}-${f.home_score}-${f.away_score}`;
    if (db.hasPosted(key)) continue;

    const msg = fmt.soccerGoal({
      home: f.home_team, away: f.away_team,
      homeScore: f.home_score, awayScore: f.away_score,
      scorer: null,
      minute: f.minute ?? "",
      leagueTag: f.league_tag,
    });

    await send(msg);
    db.markPosted(key, "soccer-live");
    console.log(`⚽ Live: ${f.home_team} ${f.home_score}-${f.away_score} ${f.away_team}`);
  }

  // Post finished results
  const finished = await api.getFinishedSoccerMatches();
  for (const m of finished) {
    const f   = api.normaliseFDMatch(m);
    const key = `soccer-ft-${f.id}`;
    if (db.hasPosted(key)) continue;

    const msg = fmt.soccerFinalResult({
      home: f.home_team, away: f.away_team,
      homeScore: f.home_score, awayScore: f.away_score,
      leagueName: f.league_name,
      leagueTag:  f.league_tag,
    });

    await send(msg);
    db.markPosted(key, "soccer-ft");
    console.log(`🏁 Soccer FT: ${f.home_team} ${f.home_score}-${f.away_score} ${f.away_team}`);
  }
}

// ── Job 2: Live NBA scores (ESPN) — COMMENTED OUT ─────────────────────────────

// async function jobLiveNBA() {
//   const games = await api.getLiveNBAGames();
//   for (const g of games) {
//     const e   = api.normaliseESPNEvent(g);
//     const key = `nba-live-${e.id}-${e.home_score}-${e.away_score}-q${e.period}`;
//     if (db.hasPosted(key)) continue;
//     const league = config.leagues.basketball[0];
//     const msg    = fmt.basketballLiveUpdate({
//       home: e.home_team, away: e.away_team,
//       homeScore: e.home_score, awayScore: e.away_score,
//       period: e.period, clock: e.clock,
//       leagueTag: league.tag,
//     });
//     await send(msg);
//     db.markPosted(key, "nba-live");
//     console.log(`🏀 NBA Live Q${e.period}: ${e.home_team} ${e.home_score}-${e.away_score} ${e.away_team}`);
//   }
//   const finished = await api.getFinishedNBAGames();
//   for (const g of finished) {
//     const e   = api.normaliseESPNEvent(g);
//     const key = `nba-ft-${e.id}`;
//     if (db.hasPosted(key)) continue;
//     const league = config.leagues.basketball[0];
//     const msg    = fmt.basketballFinalResult({
//       home: e.home_team, away: e.away_team,
//       homeScore: e.home_score, awayScore: e.away_score,
//       leagueName: league.name, leagueTag: league.tag,
//     });
//     await send(msg);
//     db.markPosted(key, "nba-ft");
//     console.log(`🏁 NBA FT: ${e.home_team} ${e.home_score}-${e.away_score} ${e.away_team}`);
//   }
// }

// ── Job 3: Live NFL scores (ESPN) — COMMENTED OUT ─────────────────────────────

// async function jobLiveNFL() {
//   const games = await api.getLiveNFLGames();
//   for (const g of games) {
//     const e   = api.normaliseESPNEvent(g);
//     const key = `nfl-live-${e.id}-${e.home_score}-${e.away_score}-q${e.period}`;
//     if (db.hasPosted(key)) continue;
//     const msg = fmt.nflLiveUpdate({
//       home: e.home_team, away: e.away_team,
//       homeScore: e.home_score, awayScore: e.away_score,
//       quarter: e.period, clock: e.clock,
//     });
//     await send(msg);
//     db.markPosted(key, "nfl-live");
//     console.log(`🏈 NFL Live Q${e.period}: ${e.home_team} ${e.home_score}-${e.away_score} ${e.away_team}`);
//   }
//   const finished = await api.getFinishedNFLGames();
//   for (const g of finished) {
//     const e   = api.normaliseESPNEvent(g);
//     const key = `nfl-ft-${e.id}`;
//     if (db.hasPosted(key)) continue;
//     const msg = fmt.nflFinalResult({
//       home: e.home_team, away: e.away_team,
//       homeScore: e.home_score, awayScore: e.away_score,
//     });
//     await send(msg);
//     db.markPosted(key, "nfl-ft");
//     console.log(`🏁 NFL FT: ${e.home_team} ${e.home_score}-${e.away_score} ${e.away_team}`);
//   }
// }

// ── Job 4: Live NHL scores (ESPN) — COMMENTED OUT ─────────────────────────────

// async function jobLiveNHL() {
//   const games = await api.getLiveNHLGames();
//   for (const g of games) {
//     const e   = api.normaliseESPNEvent(g);
//     const key = `nhl-live-${e.id}-${e.home_score}-${e.away_score}-p${e.period}`;
//     if (db.hasPosted(key)) continue;
//     const msg = fmt.nhlLiveUpdate({
//       home: e.home_team, away: e.away_team,
//       homeScore: e.home_score, awayScore: e.away_score,
//       period: e.period, clock: e.clock,
//     });
//     await send(msg);
//     db.markPosted(key, "nhl-live");
//     console.log(`🏒 NHL Live P${e.period}: ${e.home_team} ${e.home_score}-${e.away_score} ${e.away_team}`);
//   }
//   const finished = await api.getFinishedNHLGames();
//   for (const g of finished) {
//     const e   = api.normaliseESPNEvent(g);
//     const key = `nhl-ft-${e.id}`;
//     if (db.hasPosted(key)) continue;
//     const msg = fmt.nhlFinalResult({
//       home: e.home_team, away: e.away_team,
//       homeScore: e.home_score, awayScore: e.away_score,
//     });
//     await send(msg);
//     db.markPosted(key, "nhl-ft");
//     console.log(`🏁 NHL FT: ${e.home_team} ${e.home_score}-${e.away_score} ${e.away_team}`);
//   }
// }

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
        home: f.home_team, away: f.away_team, kickoff,
        leagueName: f.league_name ?? "",
        leagueTag:  f.league_tag  ?? "\\#Football",
      });
    }
    // else if (f.sport === "basketball") {
    //   msg = fmt.basketballPreMatch({
    //     home: f.home_team, away: f.away_team, kickoff,
    //     leagueName: f.league_name ?? "NBA",
    //     leagueTag:  "\\#NBA",
    //   });
    // } else if (f.sport === "americanfootball") {
    //   msg = fmt.nflPreMatch({ home: f.home_team, away: f.away_team, kickoff });
    // } else if (f.sport === "hockey") {
    //   msg = fmt.nhlPreMatch({ home: f.home_team, away: f.away_team, kickoff });
    // }

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

  // Soccer via football-data.org (EPL, UCL, World Cup)
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

  // // NBA via ESPN
  // const nbaGames = await api.getTodayNBAGames();
  // for (const g of nbaGames) {
  //   const e = api.normaliseESPNEvent(g);
  //   db.upsertFixture({
  //     fixture_id:  e.id,
  //     sport:       "basketball",
  //     league_name: "NBA",
  //     league_tag:  "#NBA",
  //     home_team:   e.home_team,
  //     away_team:   e.away_team,
  //     kickoff_utc: new Date(g.date).getTime(),
  //     status:      "NS",
  //   });
  // }

  // // NFL via ESPN
  // const nflGames = await api.getTodayNFLGames();
  // for (const g of nflGames) {
  //   const e = api.normaliseESPNEvent(g);
  //   db.upsertFixture({
  //     fixture_id:  e.id,
  //     sport:       "americanfootball",
  //     league_name: "NFL",
  //     home_team:   e.home_team,
  //     away_team:   e.away_team,
  //     kickoff_utc: new Date(g.date).getTime(),
  //     status:      "NS",
  //   });
  // }

  // // NHL via ESPN
  // const nhlGames = await api.getTodayNHLGames();
  // for (const g of nhlGames) {
  //   const e = api.normaliseESPNEvent(g);
  //   db.upsertFixture({
  //     fixture_id:  e.id,
  //     sport:       "hockey",
  //     league_name: "NHL",
  //     home_team:   e.home_team,
  //     away_team:   e.away_team,
  //     kickoff_utc: new Date(g.date).getTime(),
  //     status:      "NS",
  //   });
  // }

  console.log("✅ Today's fixtures cached");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = {
  init,
  jobLiveSoccer,
  // jobLiveNBA,   // commented out — not active
  // jobLiveNFL,   // commented out — not active
  // jobLiveNHL,   // commented out — not active
  jobNews,
  jobPreMatch,
  jobFetchDailyFixtures,
};