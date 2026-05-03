const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

// NBA servers block direct requests. These headers trick them into thinking the request comes from a normal browser.
const nbaHeaders = {
    'Host': 'stats.nba.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://stats.nba.com/',
    'Origin': 'https://stats.nba.com'
};

app.get('/', (req, res) => {
    res.json({ status: 'Proxy Active', version: '2.0' });
});

// Endpoint 1: Venue History
app.get('/api/venue-history', async (req, res) => {
    try {
        const teamId = req.query.team_id;
        if (!teamId) return res.json({ home_games: [] });
        
        const url = `https://stats.nba.com/stats/teamgamelog?TeamID=${teamId}&Season=2023-24&SeasonType=Regular%20Season`;
        const response = await fetch(url, { headers: nbaHeaders });
        const data = await response.json();
        
        // Extract data from NBA's complex grid format
        const headers = data.resultSets[0].headers;
        const rows = data.resultSets[0].rowSet;
        
        const games = rows.map(row => {
            let game = {};
            headers.forEach((h, i) => game[h] = row[i]);
            return game;
        }).filter(g => g.MATCHUP.includes('vs.')); // 'vs.' means Home game

        res.json({ home_games: games });
    } catch (e) {
        res.json({ home_games: [] });
    }
});

// Endpoint 2: Player Search (Basic Pass-through for now)
app.get('/api/player-search', async (req, res) => {
    res.json({ players: [] }); 
});

// Endpoint 3: Player Splits (Basic Pass-through for now)
app.get('/api/player/:id/splits', async (req, res) => {
    res.json({ last5: [], last10: [], homeAway: [] });
});

module.exports = app;
