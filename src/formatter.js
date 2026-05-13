// src/formatter.js
// ─────────────────────────────────────────────────────────────────────────────
// All the message templates that get posted to Telegram.
// Each function returns a string ready to send.
// ─────────────────────────────────────────────────────────────────────────────

const { leagues, sportEmoji } = require("./config");

const FOOTER = `\n\n🔗 [Join our waitlist here](https://www.getsportcliq.com)`;

// ── Soccer ────────────────────────────────────────────────────────────────────

function soccerGoal({ home, away, homeScore, awayScore, scorer, minute, leagueTag }) {
  return (
    `⚽ *GOAL\\!* ${escMd(home)} ${homeScore}–${awayScore} ${escMd(away)}${minute ? ` *\\(${minute}'\\)*` : ""}\n` +
    (scorer ? `👤 ${escMd(scorer)}\n` : "") +
    `\n${escMd(leagueTag)} \\#Football`+
    FOOTER
  );
}

function soccerFinalResult({ home, away, homeScore, awayScore, leagueName, leagueTag }) {
  return (
    `🏁 *FULL TIME*\n` +
    `${escMd(home)} *${homeScore}–${awayScore}* ${escMd(away)}\n` +
    `📋 ${escMd(leagueName)}\n` +
    `\n${escMd(leagueTag)} \\#Football \\#FT`+
    FOOTER
  );
}

function soccerPreMatch({ home, away, kickoff, leagueName, leagueTag }) {
  return (
    `🕐 *UPCOMING MATCH*\n` +
    `${escMd(home)} 🆚 ${escMd(away)}\n` +
    `⏰ ${escMd(kickoff)} \\(UTC\\)\n` +
    `📋 ${escMd(leagueName)}\n` +
    `\n${escMd(leagueTag)} \\#Football`+
    FOOTER
  );
}

// ── Basketball ────────────────────────────────────────────────────────────────

function basketballLiveUpdate({ home, away, homeScore, awayScore, period, clock, leagueTag }) {
  return (
    `🏀 *LIVE* — Q${period} ${escMd(clock || "")}\n` +
    `${escMd(home)} *${homeScore}–${awayScore}* ${escMd(away)}\n` +
    `\n${escMd(leagueTag)} \\#Basketball`+
    FOOTER
  );
}

function basketballFinalResult({ home, away, homeScore, awayScore, leagueName, leagueTag }) {
  return (
    `🏁 *FINAL*\n` +
    `${escMd(home)} *${homeScore}–${awayScore}* ${escMd(away)}\n` +
    `📋 ${escMd(leagueName)}\n` +
    `\n${escMd(leagueTag)} \\#Basketball`+
    FOOTER
  );
}

function basketballPreMatch({ home, away, kickoff, leagueName, leagueTag }) {
  return (
    `🕐 *UPCOMING GAME*\n` +
    `${escMd(home)} 🆚 ${escMd(away)}\n` +
    `⏰ ${escMd(kickoff)} \\(UTC\\)\n` +
    `📋 ${escMd(leagueName)}\n` +
    `\n${escMd(leagueTag)} \\#Basketball`+
    FOOTER
  );
}

// ── American Football ─────────────────────────────────────────────────────────

function nflLiveUpdate({ home, away, homeScore, awayScore, quarter, clock }) {
  return (
    `🏈 *LIVE* — Q${quarter} ${escMd(clock || "")}\n` +
    `${escMd(home)} *${homeScore}–${awayScore}* ${escMd(away)}\n` +
    `\n\\#NFL \\#AmericanFootball`+
    FOOTER
  );
}

function nflFinalResult({ home, away, homeScore, awayScore }) {
  return (
    `🏁 *FINAL — NFL*\n` +
    `${escMd(home)} *${homeScore}–${awayScore}* ${escMd(away)}\n` +
    `\n\\#NFL \\#AmericanFootball`+
    FOOTER
  );
}

function nflPreMatch({ home, away, kickoff }) {
  return (
    `🕐 *UPCOMING NFL GAME*\n` +
    `${escMd(home)} 🆚 ${escMd(away)}\n` +
    `⏰ ${escMd(kickoff)} \\(UTC\\)\n` +
    `\n\\#NFL \\#AmericanFootball`+
    FOOTER
  );
}

// ── Ice Hockey ────────────────────────────────────────────────────────────────

function nhlLiveUpdate({ home, away, homeScore, awayScore, period, clock }) {
  const periodLabel = period <= 3 ? `P${period}` : "OT";
  return (
    `🏒 *LIVE* — ${periodLabel} ${escMd(clock || "")}\n` +
    `${escMd(home)} *${homeScore}–${awayScore}* ${escMd(away)}\n` +
    `\n\\#NHL \\#IceHockey`+
    FOOTER
  );
}

function nhlFinalResult({ home, away, homeScore, awayScore }) {
  return (
    `🏁 *FINAL — NHL*\n` +
    `${escMd(home)} *${homeScore}–${awayScore}* ${escMd(away)}\n` +
    `\n\\#NHL \\#IceHockey`+
    FOOTER
  );
}

function nhlPreMatch({ home, away, kickoff }) {
  return (
    `🕐 *UPCOMING NHL GAME*\n` +
    `${escMd(home)} 🆚 ${escMd(away)}\n` +
    `⏰ ${escMd(kickoff)} \\(UTC\\)\n` +
    `\n\\#NHL \\#IceHockey`+
    FOOTER
  );
}

// ── News ──────────────────────────────────────────────────────────────────────

function newsArticle({ title, source, url }) {
  return (
    `📰 *${escMd(title)}*\n` +
    `🔗 [Read more on ${escMd(source)}](${url})\n` +
    `\n\\#SportNews`+
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

module.exports = {
  soccerGoal, soccerFinalResult, soccerPreMatch,
  basketballLiveUpdate, basketballFinalResult, basketballPreMatch,
  nflLiveUpdate, nflFinalResult, nflPreMatch,
  nhlLiveUpdate, nhlFinalResult, nhlPreMatch,
  newsArticle,
  escMd, formatTime,
};