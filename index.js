const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

const NBA_BASE = 'https://stats.nba.com/stats';

const NBA_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Connection': 'keep-alive',
  'Host': 'stats.nba.com',
  'Origin': 'https://www.nba.com',
  'Referer': 'https://www.nba.com/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'x-nba-stats-origin': 'stats',
  'x-nba-stats-token': 'true',
};

async function nbaFetch(endpoint, params = {}) {
  const url = new URL(`${NBA_BASE}/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { headers: NBA_HEADERS });
  if (!res.ok) throw new Error(`NBA API ${res.status}`);
  return res.json();
}

// Convert NBA resultSet into array of plain objects
function toRows(resultSet) {
  if (!resultSet) return [];
  const { headers, rowSet } = resultSet;
  return (rowSet || []).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'COURT Proxy Online', version: '2.0' });
});

// ── Player Search ─────────────────────────────────────────────────────────────
// GET /api/player-search?name=LeBron James
app.get('/api/player-search', async (req, res) => {
  const { name } = req.query;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const data = await nbaFetch('commonallplayers', {
      LeagueID: '00',
      Season: '2024-25',
      IsOnlyCurrentSeason: '1',
    });
    const rows = toRows(data.resultSets?.[0]);
    const q = name.toLowerCase();
    const matches = rows
      .filter(p => (p.DISPLAY_FIRST_LAST || '').toLowerCase().includes(q))
      .slice(0, 5)
      .map(p => ({
        PERSON_ID: p.PERSON_ID,
        DISPLAY_FIRST_LAST: p.DISPLAY_FIRST_LAST,
        TEAM_ABBREVIATION: p.TEAM_ABBREVIATION,
        PTS: null, REB: null, AST: null, FG3M: null,
      }));
    res.json({ players: matches });
  } catch (e) {
    console.error('player-search error:', e.message);
    res.status(500).json({ players: [], error: e.message });
  }
});

// ── Player Splits ─────────────────────────────────────────────────────────────
// GET /api/player/:id/splits
const SPLIT_BASE = {
  Season: '2024-25',
  SeasonType: 'Regular Season',
  MeasureType: 'Base',
  PerMode: 'PerGame',
  PlusMinus: 'N', PaceAdjust: 'N', Rank: 'N',
  Outcome: '', Location: '', Month: '0', SeasonSegment: '',
  DateFrom: '', DateTo: '', OpponentTeamID: '0',
  VsConference: '', VsDivision: '', GameSegment: '',
  Period: '0', ShotClockRange: '', GameScope: '',
  PlayerExperience: '', PlayerPosition: '', StarterBench: '',
  DraftYear: '', DraftPick: '', College: '', Country: '',
  Height: '', Weight: '', LeagueID: '00',
};

app.get('/api/player/:id/splits', async (req, res) => {
  const pid = req.params.id;
  try {
    const [last5Res, last10Res, haRes] = await Promise.all([
      nbaFetch('playerdashboardbygeneralsplits', { ...SPLIT_BASE, PlayerID: pid, LastNGames: '5' }),
      nbaFetch('playerdashboardbygeneralsplits', { ...SPLIT_BASE, PlayerID: pid, LastNGames: '10' }),
      nbaFetch('playerdashboardbylocationperformance', {
        PlayerID: pid,
        Season: '2024-25',
        SeasonType: 'Regular Season',
        MeasureType: 'Base',
        PerMode: 'PerGame',
        PlusMinus: 'N', PaceAdjust: 'N', Rank: 'N',
        Outcome: '', Month: '0', SeasonSegment: '',
        DateFrom: '', DateTo: '', OpponentTeamID: '0',
        VsConference: '', VsDivision: '', GameSegment: '',
        Period: '0', ShotClockRange: '', LeagueID: '00',
      }),
    ]);

    res.json({
      last5:    toRows(last5Res.resultSets?.[0]),
      last10:   toRows(last10Res.resultSets?.[0]),
      homeAway: toRows(haRes.resultSets?.[0]),
    });
  } catch (e) {
    console.error('splits error:', e.message);
    res.status(500).json({ last5: [], last10: [], homeAway: [], error: e.message });
  }
});

// ── Venue History ─────────────────────────────────────────────────────────────
// GET /api/venue-history?team_id=1610612747
app.get('/api/venue-history', async (req, res) => {
  const { team_id } = req.query;
  if (!team_id) return res.status(400).json({ error: 'team_id required' });
  try {
    const data = await nbaFetch('teamgamelog', {
      TeamID: team_id,
      Season: '2024-25',
      SeasonType: 'Regular Season',
      LeagueID: '00',
    });
    const rows = toRows(data.resultSets?.[0]);
    const homeGames = rows
      .filter(g => (g.MATCHUP || '').includes('vs.'))
      .slice(0, 5)
      .map(g => ({
        GAME_DATE: g.GAME_DATE,
        MATCHUP:   g.MATCHUP,
        WL:        g.WL,
        PTS:       g.PTS,
        OPP_PTS:   g.OPP_PTS,
      }));
    res.json({ home_games: homeGames });
  } catch (e) {
    console.error('venue-history error:', e.message);
    res.status(500).json({ home_games: [], error: e.message });
  }
});

module.exports = app;
