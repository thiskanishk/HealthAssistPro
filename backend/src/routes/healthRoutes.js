
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

router.get('/status', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    dbConnected: dbStatus
  });
});

module.exports = router;
