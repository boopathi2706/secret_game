const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  socketId: { type: String, required: true },
  name: { type: String, required: true },
  secretNumber: { type: String, default: null }, // Hidden 4-digit code
  hasSubmittedSecret: { type: Boolean, default: false },
  isOnline: { type: Boolean, default: true },
  isTossSelected: { type: Boolean, default: false },
  tossChoice: { type: String, enum: ['odd', 'even', null], default: null }
});

const guessSchema = new mongoose.Schema({
  playerId: { type: String, required: true },
  playerName: { type: String, required: true },
  guess: { type: String, required: true },
  correctPosition: [{
    digit: { type: Number, required: true },
    position: { type: Number, required: true }
  }],
  wrongPositionDigits: [{ type: Number }],
  timestamp: { type: Date, default: Date.now }
});

const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  players: [playerSchema],
  gameState: {
    type: String,
    enum: ['waiting', 'setup', 'toss', 'playing', 'gameover'],
    default: 'waiting'
  },
  tossWinnerId: { type: String, default: null },
  currentTurnPlayerId: { type: String, default: null },
  winnerId: { type: String, default: null },
  guessHistory: [guessSchema],
  turnStartTime: { type: Date, default: null },
  timeLimitSeconds: { type: Number, default: 45 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = {
  Room: mongoose.model('Room', roomSchema)
};
