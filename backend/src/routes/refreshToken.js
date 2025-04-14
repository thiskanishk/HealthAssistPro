
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

router.post('/', (req, res) => {
  const refreshToken = req.body.refreshToken;

  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token missing' });
  }

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const newToken = jwt.sign(
      { _id: payload._id, role: payload.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    return res.json({ token: newToken });
  } catch (error) {
    return res.status(403).json({ message: 'Invalid refresh token' });
  }
});

module.exports = router;
