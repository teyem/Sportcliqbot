async function jobLiveSoccer() {
  const liveMatches = await api.getLiveSoccerFixtures();

  // ── 0. Match started (kickoff) alerts ────────────────────────────────────
  for (const m of liveMatches) {
    const f = api.normaliseAFMatch(m);
    if (f.status !== "1H") continue; // only fire once the match enters 1st half

    const startKey = `soccer-start-${f.id}`;
    if (db.hasPosted(startKey)) continue;

    const msg = fmt.soccerMatchStarted({
      home:      f.home_team,
      away:      f.away_team,
      leagueTag: f.league_tag,
    });

    await send(msg);
    db.markPosted(startKey, "soccer-start");
    console.log(`🟢 Kickoff: ${f.home_team} vs ${f.away_team}`);
  }

  // ── 1. Live / in-play: goal alerts ───────────────────────────────────────
  for (const m of liveMatches) {
    const f = api.normaliseAFMatch(m);
    const totalGoals = (f.home_score ?? 0) + (f.away_score ?? 0);
    if (totalGoals === 0) continue;

    const goalKey = `soccer-live-${f.id}-${f.home_score}-${f.away_score}`;
    if (db.hasPosted(goalKey)) continue;

    const msg = fmt.soccerGoal({
      home:       f.home_team,
      away:       f.away_team,
      homeScore:  f.home_score,
      awayScore:  f.away_score,
      scorer:     f.scorer ?? null,
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
  for (const m of liveMatches) {
    const f = api.normaliseAFMatch(m); // was normaliseFDMatch — didn't exist, crashed the job
    if (f.status !== "HT") continue;   // API-Football uses "HT", not "PAUSED"

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
    const f   = api.normaliseAFMatch(m); // was normaliseFDMatch — same bug
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