const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const Room = require('../models/Room');
const auth = require('../middleware/auth');

router.post('/create', auth, async (req, res) => {
  try {
    const { name } = req.body;
    const roomId = uuidv4().substring(0, 8).toUpperCase();
    const room = await Room.create({ roomId, name, host: req.user._id, participants: [req.user._id] });
    res.status(201).json(room);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:roomId', auth, async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId }).populate('host', 'username');
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json(room);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
