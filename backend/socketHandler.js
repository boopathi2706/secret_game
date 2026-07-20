const { Room } = require('./models');
const { evaluateGuess } = require('./gameLogic');
const { z } = require('zod');

// Schema for guess validation
const guessSchema = z.string().length(4).regex(/^\d+$/);

module.exports = function (io) {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Helper to send cleaned room details without exposing opponent's secret key
    const broadcastRoomUpdate = async (roomId) => {
      const room = await Room.findOne({ roomId });
      if (!room) return;

      // Map details to hide secrets
      const playersSafe = room.players.map(p => ({
        _id: p._id,
        name: p.name,
        socketId: p.socketId,
        isOnline: p.isOnline,
        hasSubmittedSecret: p.hasSubmittedSecret,
        isTossSelected: p.isTossSelected,
        tossChoice: p.tossChoice
      }));

      io.to(roomId).emit('room-update', {
        roomId: room.roomId,
        players: playersSafe,
        gameState: room.gameState,
        tossWinnerId: room.tossWinnerId,
        currentTurnPlayerId: room.currentTurnPlayerId,
        winnerId: room.winnerId,
        guessHistory: room.guessHistory,
        timeLimitSeconds: room.timeLimitSeconds,
        turnStartTime: room.turnStartTime
      });
    };

    // Create Room
    socket.on('create-room', async ({ playerName }) => {
      try {
        const existingRoom = await Room.findOne({ 'players.socketId': socket.id });
        if (existingRoom) {
          socket.join(existingRoom.roomId);
          socket.emit('room-created', { roomId: existingRoom.roomId, playerSocketId: socket.id });
          await broadcastRoomUpdate(existingRoom.roomId);
          return;
        }

        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const newRoom = new Room({
          roomId,
          players: [{
            socketId: socket.id,
            name: playerName || 'Player 1'
          }],
          gameState: 'waiting'
        });
        await newRoom.save();

        socket.join(roomId);
        socket.emit('room-created', { roomId, playerSocketId: socket.id });
        await broadcastRoomUpdate(roomId);
      } catch (err) {
        socket.emit('error-msg', 'Failed to create room.');
      }
    });

    // Join Room
    socket.on('join-room', async ({ roomId, playerName }) => {
      try {
        const room = await Room.findOne({ roomId });
        if (!room) {
          socket.emit('error-msg', 'Room not found.');
          return;
        }

        // De-duplicate existing players by name
        const uniquePlayers = [];
        const seenNames = new Set();
        for (const p of room.players) {
          if (!seenNames.has(p.name)) {
            uniquePlayers.push(p);
            seenNames.add(p.name);
          }
        }
        if (uniquePlayers.length !== room.players.length) {
          room.players = uniquePlayers;
          room.markModified('players');
        }

        // If player has already joined, don't add them again
        const existingPlayer = room.players.find(p => p.socketId === socket.id);
        if (existingPlayer) {
          socket.join(roomId);
          socket.emit('room-joined', { roomId, playerSocketId: socket.id });
          await broadcastRoomUpdate(roomId);
          return;
        }

        // If there's an offline player with the same name, reclaim the slot
        const offlinePlayer = room.players.find(p => !p.isOnline && p.name === playerName);
        if (offlinePlayer) {
          offlinePlayer.socketId = socket.id;
          offlinePlayer.isOnline = true;
          room.markModified('players');
          await room.save();

          socket.join(roomId);
          socket.emit('room-joined', { roomId, playerSocketId: socket.id });
          await broadcastRoomUpdate(roomId);
          return;
        }

        if (room.players.length >= 2) {
          socket.emit('error-msg', 'Room is full.');
          return;
        }

        room.players.push({
          socketId: socket.id,
          name: playerName || 'Player 2'
        });

        // If we have 2 players, advance to setup stage
        room.gameState = 'setup';
        await room.save();

        socket.join(roomId);
        socket.emit('room-joined', { roomId, playerSocketId: socket.id });
        await broadcastRoomUpdate(roomId);
      } catch (err) {
        socket.emit('error-msg', 'Failed to join room.');
      }
    });

    // Submit Secret Number
    socket.on('submit-secret', async ({ roomId, secret }) => {
      try {
        if (!guessSchema.safeParse(secret).success) {
          socket.emit('error-msg', 'Secret must be 4 digits.');
          return;
        }

        const room = await Room.findOne({ roomId });
        if (!room) return;

        // De-duplicate existing players by name
        const uniquePlayers = [];
        const seenNames = new Set();
        for (const p of room.players) {
          if (!seenNames.has(p.name)) {
            uniquePlayers.push(p);
            seenNames.add(p.name);
          }
        }
        if (uniquePlayers.length !== room.players.length) {
          room.players = uniquePlayers;
          room.markModified('players');
        }

        const player = room.players.find(p => p.socketId === socket.id);
        if (!player) {
          console.log(`[submit-secret] Player not found for socketId: ${socket.id} in room: ${roomId}`);
          return;
        }

        if (player.hasSubmittedSecret) {
          socket.emit('error-msg', 'Secret already submitted.');
          return;
        }

        console.log(`[submit-secret] Player ${player.name} (socket ${socket.id}) submitting secret.`);
        player.secretNumber = secret;
        player.hasSubmittedSecret = true;

        console.log(`[submit-secret] Players state:`, room.players.map(p => ({ name: p.name, hasSubmittedSecret: p.hasSubmittedSecret, socketId: p.socketId })));

        // If both players have submitted, go to Toss phase
        const allSubmitted = room.players.every(p => p.hasSubmittedSecret);
        console.log(`[submit-secret] allSubmitted: ${allSubmitted}, players count: ${room.players.length}`);
        if (allSubmitted && room.players.length === 2) {
          room.gameState = 'toss';
          console.log(`[submit-secret] Advancing room ${roomId} to toss phase`);
        }

        room.markModified('players');
        await room.save();
        console.log(`[submit-secret] Room saved. Current gameState: ${room.gameState}`);
        await broadcastRoomUpdate(roomId);

      } catch (err) {
        console.error('[submit-secret] Error:', err);
        socket.emit('error-msg', 'Failed to submit secret.');
      }
    });

    // Select Toss Odd or Even
    socket.on('submit-toss-choice', async ({ roomId, choice }) => {
      try {
        if (!['odd', 'even'].includes(choice)) return;

        const room = await Room.findOne({ roomId });
        if (!room) return;

        const player = room.players.find(p => p.socketId === socket.id);
        if (!player) return;

        player.tossChoice = choice;
        player.isTossSelected = true;

        // Check if both or at least one chose (we can decide on one player choice, then execute the toss automatically)
        const opponent = room.players.find(p => p.socketId !== socket.id);

        // Toss execution logic: if player chose, we can auto-choose the opposite for opponent if they haven't chosen,
        // or just execute once one chooses. Let's do it immediately when one chooses to make it faster & smooth.
        if (player.isTossSelected) {
          const randomNumber = Math.floor(Math.random() * 100) + 1;
          const resultType = randomNumber % 2 === 0 ? 'even' : 'odd';

          let winner;
          if (choice === resultType) {
            winner = player;
          } else {
            winner = opponent;
          }

          room.tossWinnerId = winner._id.toString();
          room.currentTurnPlayerId = winner._id.toString();
          room.gameState = 'playing';
          room.turnStartTime = new Date();

          room.markModified('players');
          await room.save();

          io.to(roomId).emit('toss-animation', {
            number: randomNumber,
            result: resultType,
            winnerName: winner.name,
            winnerId: winner._id
          });

          // Wait slightly for animation to complete before starting game board updates
          setTimeout(async () => {
            await broadcastRoomUpdate(roomId);
          }, 3000);
        }
      } catch (err) {
        socket.emit('error-msg', 'Failed to submit toss choice.');
      }
    });

    // Submit Guess
    socket.on('submit-guess', async ({ roomId, guess }) => {
      try {
        if (!guessSchema.safeParse(guess).success) {
          socket.emit('error-msg', 'Guess must be a 4 digit number.');
          return;
        }

        const room = await Room.findOne({ roomId });
        if (!room) return;

        if (room.gameState !== 'playing') {
          socket.emit('error-msg', 'Game is not in progress.');
          return;
        }

        const activePlayer = room.players.find(p => p.socketId === socket.id);
        if (!activePlayer || room.currentTurnPlayerId !== activePlayer._id.toString()) {
          socket.emit('error-msg', 'It is not your turn.');
          return;
        }

        const opponent = room.players.find(p => p.socketId !== socket.id);
        if (!opponent) return;

        // Evaluate guess against opponent's secret
        const { correctPosition, wrongPositionDigits } = evaluateGuess(opponent.secretNumber, guess);

        room.guessHistory.push({
          playerId: activePlayer._id.toString(),
          playerName: activePlayer.name,
          guess,
          correctPosition,
          wrongPositionDigits
        });

        // Check if guess is correct (4 correct positions)
        if (correctPosition.length === 4) {
          room.gameState = 'gameover';
          room.winnerId = activePlayer._id.toString();
        } else {
          // Switch turn
          room.currentTurnPlayerId = opponent._id.toString();
          room.turnStartTime = new Date();
        }

        await room.save();
        await broadcastRoomUpdate(roomId);
      } catch (err) {
        socket.emit('error-msg', 'Failed to submit guess.');
      }
    });

    // Handle play again request
    socket.on('play-again', async ({ roomId }) => {
      try {
        const room = await Room.findOne({ roomId });
        if (!room) return;

        // Reset game state for players
        room.players.forEach(p => {
          p.secretNumber = null;
          p.hasSubmittedSecret = false;
          p.isTossSelected = false;
          p.tossChoice = null;
        });

        room.gameState = 'setup';
        room.tossWinnerId = null;
        room.currentTurnPlayerId = null;
        room.winnerId = null;
        room.guessHistory = [];
        room.turnStartTime = null;

        room.markModified('players');
        await room.save();

        await broadcastRoomUpdate(roomId);
      } catch (err) {
        socket.emit('error-msg', 'Failed to restart game.');
      }
    });

    // Opponent Typing indicator
    socket.on('typing', ({ roomId, isTyping }) => {
      socket.to(roomId).emit('opponent-typing', { isTyping });
    });

    // Disconnect handling
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      // Find room containing this socket
      const room = await Room.findOne({ 'players.socketId': socket.id });
      if (room) {
        const player = room.players.find(p => p.socketId === socket.id);
        if (player) {
          player.isOnline = false;
          await room.save();
          await broadcastRoomUpdate(room.roomId);
        }
      }
    });
  });
};
