const express = require('express');
const router = express.Router();

router.get('/', (req, res, next) => {
  try {
    res.json({ status: 'ok' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
