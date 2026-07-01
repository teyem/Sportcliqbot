// src/config.js
// ─────────────────────────────────────────────────────────────────────────────
// Central config: league IDs, schedules, sport labels.
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  // ── League definitions ────────────────────────────────────────────────────
 leagues: {
  soccer: [
    // API-Football (api-sports.io) league IDs — different scheme to the old
    // football-data.org codes and to the old (unused) TheSportsDB ids.
    { id: 39, name: "Premier League",   flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", tag: "#EPL"      },
    { id: 2,  name: "Champions League", flag: "🏆",      tag: "#UCL"      },
    { id: 1,  name: "World Cup",        flag: "🌍",      tag: "#WorldCup" },
  ],
},

  // ── Cron schedules (UTC, 6-field with seconds) ────────────────────────────
  cron: {
    // Every 30 seconds, all hours — World Cup games can kick off any time UTC.
    // football-data.org free tier = 10 req/min; we make 2 calls per tick = 4/min. Safe.
    liveScores:    "*/30 * * * * *",

    // News — every 2 hours
    news:          "0 0 */2 * * *",

    // Pre-match alerts — top of every hour
    preMatch:      "0 0 * * * *",

    // Daily fixture fetch — 06:00 UTC (before most matches)
    dailyFixtures: "0 0 6 * * *",
  },

  // ── Sport emoji map ───────────────────────────────────────────────────────
  sportEmoji: {
    soccer: "⚽",
  },

  // ── Google News RSS feeds ─────────────────────────────────────────────────
  newsFeeds: [
    {
      url:  "https://news.google.com/rss/search?q=premier+league+football&hl=en-US&gl=US&ceid=US:en",
      name: "Google News - EPL",
    },
    {
      url:  "https://news.google.com/rss/search?q=champions+league+football&hl=en-US&gl=US&ceid=US:en",
      name: "Google News - UCL",
    },
    {
      url:  "https://news.google.com/rss/search?q=world+cup+football&hl=en-US&gl=US&ceid=US:en",
      name: "Google News - World Cup",
    },
  ],

  // ── Keywords to filter news ───────────────────────────────────────────────
  newsKeywords: [
    "premier league", "epl",
    "champions league", "ucl",
    "world cup",
    "football", "soccer",
    "transfer", "injury", "goal", "match", "score", "signing",
  ],
};