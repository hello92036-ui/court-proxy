// COURT Proxy — v3.0
// BallDontLie API calls now happen directly from the browser (no CORS issues).
// This proxy is kept as a health-check endpoint and future expansion point.

const express = require('express');
const cors    = require('cors');
const app     = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'COURT Proxy Online', version: '3.0', note: 'BDL calls are now client-side' });
});

module.exports = app;
