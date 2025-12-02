const express = require('express');
const router = express.Router();
const User = require('./user');

// POST /api/auth/register
// body: { email, name }
router.post('/register', async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email, name });
      await user.save();
    }
    res.json({ user: { id: user._id, email: user.email, name: user.name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
// body: { email }
// If the user doesn't exist, create a lightweight user record.
router.post('/login', async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email, name });
      await user.save();
    }
    res.json({ user: { id: user._id, email: user.email, name: user.name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/profile?userId=... - return user profile
router.get('/profile', async (req, res) => {
  try {
    const userId = req.query.userId || req.body.userId;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const user = await User.findById(userId).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error('Error in GET /api/auth/profile', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/profile - update user profile
// body: { userId, name?, age?, weight?, email? }
router.post('/profile', async (req, res) => {
  try {
    const { userId, name, age, weight, email } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const update = {};
    if (name !== undefined) update.name = name;
    if (age !== undefined) update.age = age;
    if (weight !== undefined) update.weight = weight;
    if (email !== undefined) update.email = email;
    const user = await User.findByIdAndUpdate(userId, update, { new: true }).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error('Error in POST /api/auth/profile', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
