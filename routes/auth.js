const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Sync Firebase User with MongoDB
router.post('/sync', async (req, res) => {
  try {
    const { firebaseUid, email } = req.body;
    
    if (!firebaseUid || !email) {
      return res.status(400).json({ error: 'firebaseUid and email are required' });
    }

    let user = await User.findOne({ firebaseUid });

    if (!user) {
      user = new User({ firebaseUid, email });
      await user.save();
    }

    res.json({ message: 'User synced successfully', user });
  } catch (error) {
    console.error('Error syncing user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
