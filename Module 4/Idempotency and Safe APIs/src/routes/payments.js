
'use strict';
// routes/payments.js

const router = require('express').Router();
const { charges, idempotency, nextChargeId } = require('../store');

router.post('/', (req, res) => {
  // Rule 1: Reject requests without an idempotency key.
  const key = req.headers['idempotency-key'];

  if (!key) {
    return res.status(400).json({
      error: {
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'Idempotency-Key header is required'
      }
    });
  }

  // Rule 2: If this key was used before, return the saved response.
  // Do not charge the card again.
  if (idempotency.has(key)) {
    const saved = idempotency.get(key);
    return res.status(saved.status).json(saved.body);
  }

  // Rule 3: A new key creates exactly one charge.
  const amount = req.body && req.body.amount;

  const charge = {
    id: nextChargeId(),
    amount,
    status: 'charged'
  };

  charges.push(charge);

  // Save the complete response for future retries.
  const status = 201;
  const body = {
    id: charge.id,
    amount: charge.amount,
    status: charge.status
  };

  idempotency.set(key, { status, body });

  return res.status(status).json(body);
});

module.exports = router;
