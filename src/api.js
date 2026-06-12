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
  timeout: 30000,
});

// const espn = axios.create({
//   baseURL: "https://site.api.espn.com/apis/site/v2/sports",
//   timeout: 10000,
// });

const sportsdb = axios.create({
  baseURL: "https://www.thesportsdb.com/api/v1/json/123",
  timeout: 10000,
});

// ── Competition codes for football-data.org ───────────────────────────────────
// Active: Premier League (PL), Champions League (CL), World Cup (WC)
const FD_COMPETITIONS = ["PL", "CL", "WC"];
// Commented out: "PD" (La Liga), "SA" (Serie A), "BL1" (Bundesliga),
//                "FL1" (Ligue 1), "EL" (Europa League), "CLI" (Copa Libertadores)



// ── Soccer Live Scores (football-data.org) ────────────────────────────────────

async function getLiveSoccerFixtures(retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await footballData.get("/matches", {
        params: { status: "LIVE,IN_PLAY,PAUSED" },
      });
      return (res.data.matches ?? []).filter((m) =>
        FD_COMPETITIONS.includes(m.competition?.code)
      );
    } catch (e) {
      const isLast = attempt === retries;
      console.error(
        `❌ getLiveSoccerFixtures (attempt ${attempt + 1}/${retries + 1}):`,
        e.message
      );
      if (isLast) return [];
      await sleep(3000); // wait 3s before retrying
    }
  }
  return [];
}


async function getTodaySoccerFixtures() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const res   = await footballData.get("/matches", {
      params: { dateFrom: today, dateTo: today },
    });
    return (res.data.matches ?? []).filter((m) =>
      FD_COMPETITIONS.includes(m.competition?.code)
    );
  } catch (e) {
    console.error("❌ getTodaySoccerFixtures:", e.message);
    return [];
  }
}

// ── NBA Live Scores (ESPN) — COMMENTED OUT ────────────────────────────────────

// async function getLiveNBAGames() {
//   try {
//     const res = await espn.get("/basketball/nba/scoreboard");
//     return (res.data.events ?? []).filter((e) => {
//       const status = e.status?.type?.name;
//       return status === "STATUS_IN_PROGRESS" || status === "STATUS_HALFTIME";
//     });
//   } catch (e) {
//     console.error("❌ getLiveNBAGames:", e.message);
//     return [];
//   }
// }

// async function getFinishedNBAGames() {
//   try {
//     const res = await espn.get("/basketball/nba/scoreboard");
//     return (res.data.events ?? []).filter(
//       (e) => e.status?.type?.name === "STATUS_FINAL"
//     );
//   } catch (e) {
//     console.error("❌ getFinishedNBAGames:", e.message);
//     return [];
//   }
// }

// async function getTodayNBAGames() {
//   try {
//     const res = await espn.get("/basketball/nba/scoreboard");
//     return res.data.events ?? [];
//   } catch (e) {
//     console.error("❌ getTodayNBAGames:", e.message);
//     return [];
//   }
// }

// ── NFL Live Scores (ESPN) — COMMENTED OUT ────────────────────────────────────

// async function getLiveNFLGames() {
//   try {
//     const res = await espn.get("/football/nfl/scoreboard");
//     return (res.data.events ?? []).filter((e) => {
//       const status = e.status?.type?.name;
//       return status === "STATUS_IN_PROGRESS" || status === "STATUS_HALFTIME";
//     });
//   } catch (e) {
//     console.error("❌ getLiveNFLGames:", e.message);
//     return [];
//   }
// }

// async function getFinishedNFLGames() {
//   try {
//     const res = await espn.get("/football/nfl/scoreboard");
//     return (res.data.events ?? []).filter(
//       (e) => e.status?.type?.name === "STATUS_FINAL"
//     );
//   } catch (e) {
//     console.error("❌ getFinishedNFLGames:", e.message);
//     return [];
//   }
// }

// async function getTodayNFLGames() {
//   try {
//     const res = await espn.get("/football/nfl/scoreboard");
//     return res.data.events ?? [];
//   } catch (e) {
//     console.error("❌ getTodayNFLGames:", e.message);
//     return [];
//   }
// }

// ── NHL Live Scores (ESPN) — COMMENTED OUT ────────────────────────────────────

// async function getLiveNHLGames() {
//   try {
//     const res = await espn.get("/hockey/nhl/scoreboard");
//     return (res.data.events ?? []).filter((e) => {
//       const status = e.status?.type?.name;
//       return status === "STATUS_IN_PROGRESS" || status === "STATUS_HALFTIME";
//     });
//   } catch (e) {
//     console.error("❌ getLiveNHLGames:", e.message);
//     return [];
//   }
// }

// async function getFinishedNHLGames() {
//   try {
//     const res = await espn.get("/hockey/nhl/scoreboard");
//     return (res.data.events ?? []).filter(
//       (e) => e.status?.type?.name === "STATUS_FINAL"
//     );
//   } catch (e) {
//     console.error("❌ getFinishedNHLGames:", e.message);
//     return [];
//   }
// }

// async function getTodayNHLGames() {
//   try {
//     const res = await espn.get("/hockey/nhl/scoreboard");
//     return res.data.events ?? [];
//   } catch (e) {
//     console.error("❌ getTodayNHLGames:", e.message);
//     return [];
//   }
// }

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

// ── Normalise ESPN event → internal shape — COMMENTED OUT ────────────────────

// function normaliseESPNEvent(e) {
//   const comp   = e.competitions?.[0];
//   const home   = comp?.competitors?.find((c) => c.homeAway === "home");
//   const away   = comp?.competitors?.find((c) => c.homeAway === "away");
//   const status = e.status?.type?.name ?? "";
//   const period = e.status?.period ?? 1;
//   const clock  = e.status?.displayClock ?? "";
//   return {
//     id:         e.id,
//     home_team:  home?.team?.displayName ?? "",
//     away_team:  away?.team?.displayName ?? "",
//     home_score: Number(home?.score ?? 0),
//     away_score: Number(away?.score ?? 0),
//     status,
//     period,
//     clock,
//     is_live:    status === "STATUS_IN_PROGRESS" || status === "STATUS_HALFTIME",
//     is_final:   status === "STATUS_FINAL",
//   };
// }

// ── Normalise football-data.org match → internal shape ───────────────────────

function normaliseFDMatch(m) {
  const compMap = {
    PL:  { name: "Premier League",   tag: "#EPL"      },
    CL:  { name: "Champions League", tag: "#UCL"      },
    WC:  { name: "World Cup",        tag: "#WorldCup" },
    // PD:  { name: "La Liga",       tag: "#LaLiga"    },
    // SA:  { name: "Serie A",       tag: "#SerieA"    },
    // BL1: { name: "Bundesliga",    tag: "#Bundesliga"},
    // FL1: { name: "Ligue 1",       tag: "#Ligue1"    },
    // EL:  { name: "Europa League", tag: "#UEL"       },
  };
  const league = compMap[m.competition?.code] ?? {
    name: m.competition?.name ?? "",
    tag:  "#Football",
  };

  return {
    id:          m.id,
    home_team:   m.homeTeam?.shortName ?? m.homeTeam?.name ?? "",
    away_team:   m.awayTeam?.shortName ?? m.awayTeam?.name ?? "",
    home_score:  m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? 0,
    away_score:  m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? 0,
    status:      m.status,
    minute:      m.minute ?? m.score?.minute ?? null,
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
  // Soccer
  getLiveSoccerFixtures,
  getTodaySoccerFixtures,
  normaliseFDMatch,
  // NBA — commented out
  // getLiveNBAGames,
  // getFinishedNBAGames,
  // getTodayNBAGames,
  // NFL — commented out
  // getLiveNFLGames,
  // getFinishedNFLGames,
  // getTodayNFLGames,
  // NHL — commented out
  // getLiveNHLGames,
  // getFinishedNHLGames,
  // getTodayNHLGames,
  // normaliseESPNEvent, // commented out
  getTodayFixturesByLeague,
  sleep,
  currentSeason,
};