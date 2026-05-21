// src/config.js
// ─────────────────────────────────────────────────────────────────────────────
// Central config: league IDs, schedules, sport labels.
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  // ── League definitions ────────────────────────────────────────────────────
  leagues: {
    soccer: [
      { id: 4328, name: "Premier League",   flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", tag: "#EPL"      },
      { id: 4480, name: "Champions League", flag: "🏆",      tag: "#UCL"      },
      { id: 4429, name: "World Cup",        flag: "🌍",      tag: "#WorldCup" },
      // { id: 4335, name: "La Liga",       flag: "🇪🇸",     tag: "#LaLiga"    },
      // { id: 4332, name: "Serie A",       flag: "🇮🇹",     tag: "#SerieA"    },
      // { id: 4331, name: "Bundesliga",    flag: "🇩🇪",     tag: "#Bundesliga"},
      // { id: 4334, name: "Ligue 1",       flag: "🇫🇷",     tag: "#Ligue1"    },
      // { id: 4481, name: "Europa League", flag: "🟠",      tag: "#UEL"       },
    ],
    // basketball: [
    //   { id: 4387, name: "NBA", flag: "🏀", tag: "#NBA" },
    // ],
    // americanfootball: [
    //   { id: 4391, name: "NFL", flag: "🏈", tag: "#NFL" },
    // ],
    // hockey: [
    //   { id: 4380, name: "NHL", flag: "🏒", tag: "#NHL" },
    // ],
  },

  // ── Cron schedules (UTC, 6-field with seconds) ────────────────────────────
  cron: {
    liveScores:    "*/30 * 10-23 * * *",
    news:          "0 0 */2 * * *",
    preMatch:      "0 0 * * * *",
    dailyFixtures: "0 0 7 * * *",
  },

  // ── Sport emoji map ───────────────────────────────────────────────────────
  sportEmoji: {
    soccer: "⚽",
    // basketball:       "🏀",
    // americanfootball: "🏈",
    // hockey:           "🏒",
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
    // { url: "https://news.google.com/rss/search?q=NBA+basketball&hl=en-US&gl=US&ceid=US:en",          name: "Google News - NBA" },
    // { url: "https://news.google.com/rss/search?q=NFL+american+football&hl=en-US&gl=US&ceid=US:en",   name: "Google News - NFL" },
    // { url: "https://news.google.com/rss/search?q=NHL+hockey&hl=en-US&gl=US&ceid=US:en",              name: "Google News - NHL" },
  ],

  // ── Keywords to filter news — only posts relevant articles ────────────────
  newsKeywords: [
    "premier league", "epl",
    "champions league", "ucl",
    "world cup",
    "football", "soccer",
    "transfer", "injury", "goal", "match", "score", "signing",
    // "la liga", "serie a", "bundesliga", "ligue 1", "europa league",
    // "nba", "nfl", "nhl", "basketball", "hockey",
  ],
};