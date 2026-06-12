// src/index.js
require("dotenv").config();
const cron        = require("node-cron");
const TelegramBot = require("node-telegram-bot-api");

const config = require("./config");
const jobs   = require("./jobs");
const db     = require("./db");

// ── Validate env vars ─────────────────────────────────────────────────────────

const REQUIRED = ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHANNEL_ID", "FOOTBALL_DATA_KEY"];
for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`❌ Missing required env var: ${key}`);
    process.exit(1);
  }
}

// ── Boot bot ──────────────────────────────────────────────────────────────────

const bot       = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
const channelId = process.env.TELEGRAM_CHANNEL_ID;

jobs.init(bot, channelId);

console.log("🤖 SportCliq Bot starting...");
console.log(`📡 Channel: ${channelId}`);

// ── Cron helper ───────────────────────────────────────────────────────────────

function safeJob(name, fn) {
  return async () => {
    try {
      await fn();
    } catch (e) {
      console.error(`❌ Job [${name}] uncaught error:`, e.message);
    }
  };
}

// ── Register cron jobs ────────────────────────────────────────────────────────

// Live scores — every 2 minutes during match hours (football only)
// src/index.js
cron.schedule(config.cron.liveScores, safeJob("liveScores", async () => {
  await jobs.jobLiveSoccer();
  // await jobs.jobLiveNBA();   // commented out — not active
  // await jobs.jobLiveNFL();   // commented out — not active
  // await jobs.jobLiveNHL();   // commented out — not active
}));

// News — disabled per client request
// cron.schedule(config.cron.news, safeJob("news", jobs.jobNews));

// Pre-match alerts — top of every hour
cron.schedule(config.cron.preMatch, safeJob("preMatch", jobs.jobPreMatch));

// Daily fixture fetch — 07:00 UTC
cron.schedule(config.cron.dailyFixtures, safeJob("dailyFixtures", async () => {
  await jobs.jobFetchDailyFixtures();
  db.cleanup();
}));

// ── Run once on startup ───────────────────────────────────────────────────────

(async () => {
  try {
    await jobs.jobFetchDailyFixtures();

    await bot.sendMessage(channelId, "🤖 SportCliq Bot is live\\!", {
      parse_mode: "MarkdownV2",
    });

    console.log("✅ SportCliq Bot is live and running!");
  } catch (e) {
    console.error("❌ Startup error:", e.message);
  }
})();

// ── Keep-alive server for Render ──────────────────────────────────────────────
const http = require("http");
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot is alive!");
}).listen(PORT, () => {
  console.log(`🌐 Keep-alive server on port ${PORT}`);
});