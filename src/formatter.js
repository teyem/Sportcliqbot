// src/formatter.js
// ─────────────────────────────────────────────────────────────────────────────
// All the message templates that get posted to Telegram.
// Each function returns a string ready to send.
// ─────────────────────────────────────────────────────────────────────────────

const FOOTER = `\n\n🔗 [Join our waitlist here](https://www.getsportcliq.com)`;

// ── Soccer ────────────────────────────────────────────────────────────────────

function soccerGoal({ home, away, homeScore, awayScore, scorer, minute, leagueTag }) {
  // Safety net: never post a goal alert at 0–0
  if ((homeScore ?? 0) + (awayScore ?? 0) === 0) return null;

  return (
    `⚽ *GOAL\\!* ${escMd(home)} ${homeScore}–${awayScore} ${escMd(away)}` +
    (minute ? ` *\\(${minute}'\\)*` : "") +
    `\n` +
    (scorer ? `👤 ${escMd(scorer)}\n` : "") +
    `\n${escMd(leagueTag)} \\#Football` +
    FOOTER
  );
}

function soccerHalfTime({ home, away, homeScore, awayScore, leagueTag }) {
  return (
    `⏸ *HALF TIME*\n` +
    `${escMd(home)} *${homeScore}–${awayScore}* ${escMd(away)}\n` +
    `\n${escMd(leagueTag)} \\#Football \\#HT` +
    FOOTER
  );
}

function soccerFinalResult({ home, away, homeScore, awayScore, leagueName, leagueTag, status, penaltyHome, penaltyAway }) {
  let label = "FULL TIME";
  let penaltyLine = "";

  if (status === "AET") {
    label = "FULL TIME \\(AFTER EXTRA TIME\\)";
  } else if (status === "PEN") {
    label = "FULL TIME \\(PENALTIES\\)";
    if (penaltyHome != null && penaltyAway != null) {
      penaltyLine = `🎯 Penalties: *${penaltyHome}–${penaltyAway}*\n`;
    }
  }

  return (
    `🏁 *${label}*\n` +
    `${escMd(home)} *${homeScore}–${awayScore}* ${escMd(away)}\n` +
    penaltyLine +
    `📋 ${escMd(leagueName)}\n` +
    `\n${escMd(leagueTag)} \\#Football \\#FT` +
    FOOTER
  );
}

function soccerPreMatch({ home, away, kickoff, leagueName, leagueTag }) {
  return (
    `🕐 *UPCOMING MATCH*\n` +
    `${escMd(home)} 🆚 ${escMd(away)}\n` +
    `⏰ ${escMd(kickoff)} \\(UTC\\)\n` +
    `📋 ${escMd(leagueName)}\n` +
    `\n${escMd(leagueTag)} \\#Football` +
    FOOTER
  );
}

// ── Basketball (commented out but kept for future use) ────────────────────────

// function basketballLiveUpdate(...) { ... }
// function basketballFinalResult(...) { ... }
// function basketballPreMatch(...) { ... }

// ── American Football (commented out) ────────────────────────────────────────

// function nflLiveUpdate(...) { ... }
// function nflFinalResult(...) { ... }
// function nflPreMatch(...) { ... }

// ── Ice Hockey (commented out) ────────────────────────────────────────────────

// function nhlLiveUpdate(...) { ... }
// function nhlFinalResult(...) { ... }
// function nhlPreMatch(...) { ... }

// ── News ──────────────────────────────────────────────────────────────────────

function newsArticle({ title, source, url }) {
  return (
    `📰 *${escMd(title)}*\n` +
    `🔗 [Read more on ${escMd(source)}](${url})\n` +
    `\n\\#SportNews` +
    FOOTER
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Escape special MarkdownV2 characters */
function escMd(text = "") {
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

/** Format a UTC timestamp as a readable time string */
function formatTime(utcMs) {
  return new Date(utcMs).toUTCString().replace(" GMT", "");
}

function soccerMatchStarted({ home, away, leagueTag }) {
  return (
    `🟢 *KICK\\-OFF\\!*\n` +
    `${escMd(home)} 🆚 ${escMd(away)}\n` +
    `\n${escMd(leagueTag)} \\#Football` +
    FOOTER
  );
}

module.exports = {
  soccerGoal,
  soccerHalfTime,
  soccerFinalResult,
  soccerPreMatch,
  soccerMatchStarted, // add this
  newsArticle,
  escMd,
  formatTime,
};