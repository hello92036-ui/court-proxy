const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

// Health Check
app.get('/', (req, res) => {
    res.json({ status: 'Proxy Online', version: '1.0' });
});

// Endpoint 1: Venue History Shell
app.get('/api/venue-history', async (req, res) => {
    res.json({ home_games: [] });
});

// Endpoint 2: Player Search Shell
app.get('/api/player-search', async (req, res) => {
    res.json({ players: [] });
});

// Endpoint 3: Player Splits Shell
app.get('/api/player/:id/splits', async (req, res) => {
    res.json({ last5: [], last10: [], homeAway: [] });
});

module.exports = app;

