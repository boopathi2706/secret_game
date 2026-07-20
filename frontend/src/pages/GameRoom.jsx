import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Users, Send, CheckCircle2, RotateCcw, AlertTriangle, ArrowRight, Award } from 'lucide-react';
import toast from 'react-hot-toast';

export default function GameRoom() {
  const { socket, isConnected } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();

  // State retrieved from location
  const { playerName, action, roomId: initialRoomId } = location.state || {};

  // Game details state
  const [roomState, setRoomState] = useState(null);
  const [secretInput, setSecretInput] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [tossResult, setTossResult] = useState(null);
  const [isOpponentTyping, setIsOpponentTyping] = useState(false);
  const [tossLoading, setTossLoading] = useState(false);

  // Prevent duplicate join/create on double mount
  const hasJoinedRef = useRef(false);

  // Local helper variables
  const myPlayer = roomState?.players.find(p => p.socketId === socket?.id);
  const opponentPlayer = roomState?.players.find(p => p.socketId !== socket?.id);

  // Sound effects toggles (simple feedback)
  const playAudioFeedback = (type) => {
    // For standard web interactions without external media files, we can use Web Audio API synth!
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'toss') {
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.65);
        osc.start();
        osc.stop(ctx.currentTime + 0.7);
      } else if (type === 'guess') {
        osc.frequency.setValueAtTime(500, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch (e) {
      // Audio context error or blocked by autoplay
    }
  };

  useEffect(() => {
    if (!socket || !playerName) {
      toast.error('Invalid session. Please sign in again.');
      navigate('/');
      return;
    }

    if (!hasJoinedRef.current) {
      hasJoinedRef.current = true;
      // Join or Create Room on Mount
      if (action === 'create') {
        socket.emit('create-room', { playerName });
      } else if (action === 'join' && initialRoomId) {
        socket.emit('join-room', { roomId: initialRoomId, playerName });
      }
    }

    // Bind listeners
    socket.on('room-created', ({ roomId }) => {
      toast.success(`Room created! ID: ${roomId}`);
    });

    socket.on('room-joined', ({ roomId }) => {
      toast.success(`Joined room! ID: ${roomId}`);
    });

    socket.on('room-update', (updatedState) => {
      setRoomState(updatedState);
    });

    socket.on('toss-animation', ({ number, result, winnerName, winnerId }) => {
      setTossLoading(true);
      playAudioFeedback('toss');
      setTimeout(() => {
        setTossResult({ number, result, winnerName, winnerId });
        setTossLoading(false);
      }, 2500);
    });

    socket.on('opponent-typing', ({ isTyping }) => {
      setIsOpponentTyping(isTyping);
    });

    socket.on('error-msg', (msg) => {
      toast.error(msg);
    });

    return () => {
      socket.off('room-created');
      socket.off('room-joined');
      socket.off('room-update');
      socket.off('toss-animation');
      socket.off('opponent-typing');
      socket.off('error-msg');
    };
  }, [socket, playerName, action, initialRoomId, navigate]);

  // Handle Clipboard Copy
  const copyRoomId = () => {
    if (roomState?.roomId) {
      navigator.clipboard.writeText(roomState.roomId);
      toast.success('Room Code copied to clipboard!');
    }
  };

  // Submit secret 4 digits
  const handleSubmitSecret = () => {
    if (secretInput.length !== 4 || isNaN(secretInput)) {
      toast.error('Please enter a valid 4-digit code.');
      return;
    }
    socket.emit('submit-secret', { roomId: roomState.roomId, secret: secretInput });
    toast.success('Secret code locked in.');
    playAudioFeedback('success');
  };

  // Submit Odd/Even Toss Choice
  const handleTossChoice = (choice) => {
    socket.emit('submit-toss-choice', { roomId: roomState.roomId, choice });
  };

  // Handle Typing indicator
  const handleGuessInputChange = (val) => {
    setGuessInput(val);
    socket.emit('typing', { roomId: roomState.roomId, isTyping: val.length > 0 });
  };

  // Submit Guess
  const handleSubmitGuess = () => {
    if (guessInput.length !== 4 || isNaN(guessInput)) {
      toast.error('Please enter a valid 4-digit guess.');
      return;
    }
    socket.emit('submit-guess', { roomId: roomState.roomId, guess: guessInput });
    setGuessInput('');
    socket.emit('typing', { roomId: roomState.roomId, isTyping: false });
    playAudioFeedback('guess');
  };

  // Play again without room destruction
  const handlePlayAgain = () => {
    socket.emit('play-again', { roomId: roomState.roomId });
    setTossResult(null);
  };

  // Handle Quit
  const handleQuit = () => {
    navigate('/');
  };

  // Loading indicator until state arrives
  if (!roomState) {
    return (
      <div className="min-h-screen bg-background-custom text-primary flex flex-col items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full mb-4"
        />
        <p className="font-semibold animate-pulse">Connecting and joining room...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-custom text-primary flex flex-col justify-between p-6">
      {/* Header Info */}
      <header className="max-w-7xl w-full mx-auto flex items-center justify-between py-2 border-b border-primary/10">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-secondary">
            S4
          </div>
          <span className="font-bold tracking-wide">SECRET 4</span>
        </div>

        <div className="flex items-center gap-4 text-sm font-semibold">
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-primary/10 shadow-sm">
            <span className="opacity-60">Room:</span>
            <span className="text-success-custom uppercase font-bold">{roomState.roomId}</span>
            <button onClick={copyRoomId} className="hover:text-success-custom transition-colors ml-1">
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Switchboard for Stages */}
      <main className="max-w-7xl w-full mx-auto my-auto py-8">
        {/* Phase 1: Waiting for opponent */}
        {roomState.gameState === 'waiting' && (
          <div className="max-w-md mx-auto text-center flex flex-col gap-6 py-12">
            <div className="w-20 h-20 rounded-full bg-secondary/30 flex items-center justify-center mx-auto text-primary animate-bounce">
              <Users className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Waiting for Player 2...</h2>
              <p className="text-primary/70 text-sm mt-1">Share the room code below to invite your opponent.</p>
            </div>

            <div className="glass-panel p-6 flex flex-col gap-3">
              <span className="text-xs uppercase font-bold tracking-wider opacity-60">Room Code</span>
              <div className="flex items-center justify-center gap-3 bg-background-custom border border-primary/10 py-3 rounded-xl">
                <span className="text-3xl font-extrabold tracking-widest text-primary">{roomState.roomId}</span>
                <button onClick={copyRoomId} className="bg-primary text-secondary p-2 rounded-lg hover:opacity-90">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Phase 2: Setup (Choose Secret) */}
        {roomState.gameState === 'setup' && (
          <div className="max-w-md mx-auto text-center flex flex-col gap-6">
            <div>
              <h2 className="text-3xl font-bold">Lock your Secret Code</h2>
              <p className="text-primary/70 text-sm mt-1">Select a 4-digit code. Keep it hidden from your opponent!</p>
            </div>

            <div className="glass-panel p-8 flex flex-col gap-6">
              {!myPlayer?.hasSubmittedSecret ? (
                <>
                  <input
                    type="password"
                    maxLength={4}
                    value={secretInput}
                    onChange={(e) => setSecretInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full text-center text-4xl font-bold tracking-widest py-3 border border-primary/20 bg-background-custom rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    onClick={handleSubmitSecret}
                    className="w-full bg-primary text-secondary font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all button-glow"
                  >
                    Lock Code <ArrowRight className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 py-6">
                  <CheckCircle2 className="w-12 h-12 text-success-custom animate-pulse" />
                  <p className="font-bold text-success-custom">Secret Locked successfully!</p>
                  <p className="text-xs opacity-70">Waiting for opponent to submit their secret...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Phase 3: Toss */}
        {roomState.gameState === 'toss' && (
          <div className="max-w-md mx-auto text-center flex flex-col gap-6">
            <div>
              <h2 className="text-3xl font-bold">The Toss Decision</h2>
              <p className="text-primary/70 text-sm mt-1">Choose Odd or Even to determine who guesses first!</p>
            </div>

            <div className="glass-panel p-8 flex flex-col gap-6">
              {tossLoading ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="w-16 h-16 rounded-full bg-secondary border-4 border-primary border-t-transparent animate-spin flex items-center justify-center">
                    <span className="font-bold text-primary">🪙</span>
                  </div>
                  <span className="font-bold animate-pulse text-sm">Flipping coin...</span>
                </div>
              ) : (
                <>
                  {!myPlayer?.isTossSelected ? (
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => handleTossChoice('odd')}
                        className="bg-primary text-secondary py-4 rounded-2xl font-extrabold hover:opacity-95 transition-all text-lg shadow-sm"
                      >
                        ODD
                      </button>
                      <button
                        onClick={() => handleTossChoice('even')}
                        className="bg-secondary text-primary py-4 rounded-2xl font-extrabold hover:opacity-95 border border-primary/20 transition-all text-lg shadow-sm"
                      >
                        EVEN
                      </button>
                    </div>
                  ) : (
                    <div className="py-6">
                      <p className="font-semibold text-primary/70 animate-pulse">Waiting for flip result...</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Phase 4: Board (Main Game Board) */}
        {roomState.gameState === 'playing' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel: Secret Info & Guesses */}
            <div className="glass-panel p-6 flex flex-col gap-6">
              <div>
                <span className="text-xs uppercase font-extrabold opacity-60">Your Secret Code</span>
                <div className="text-2xl font-bold tracking-widest text-success-custom mt-1">
                  {secretInput || '••••'}
                </div>
              </div>

              <div>
                <span className="text-xs uppercase font-extrabold opacity-60">Your Previous Guesses</span>
                <div className="flex flex-col gap-2 mt-3 overflow-y-auto max-h-[300px] pr-1">
                  {roomState.guessHistory
                    .filter(g => g.playerId === myPlayer?._id)
                    .map((g, idx) => (
                      <div key={idx} className="bg-background-custom p-3.5 rounded-xl border border-primary/10 flex flex-col gap-1.5 shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold tracking-widest text-lg text-primary">{g.guess}</span>
                          <span className="text-xs text-primary/50">Guess #{idx + 1}</span>
                        </div>
                        <div className="text-xs flex flex-wrap gap-2">
                          <span className="bg-success-custom/10 text-success-custom px-2 py-0.5 rounded-md font-bold">
                            {g.correctPosition.length} Correct Pos
                          </span>
                          <span className="bg-warning-custom/10 text-warning-custom px-2 py-0.5 rounded-md font-bold">
                            {g.wrongPositionDigits.length} Wrong Pos
                          </span>
                        </div>
                        {/* Detailed digit feedback */}
                        <div className="text-[11px] flex flex-col gap-1 border-t border-primary/5 pt-1.5 mt-1">
                          {g.correctPosition.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              <span className="opacity-60 font-semibold">Correct:</span>
                              {g.correctPosition.map((posInfo, pIdx) => (
                                <span key={pIdx} className="text-success-custom font-bold">
                                  {posInfo.digit} at Pos {posInfo.position}{pIdx < g.correctPosition.length - 1 ? ',' : ''}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="text-primary/40 italic">No correct positions</div>
                          )}
                          {g.wrongPositionDigits.length > 0 ? (
                            (() => {
                              const guessDigits = g.guess.split('');
                              const correctIndices = g.correctPosition.map(posInfo => posInfo.position - 1);
                              const remainingDigits = guessDigits.filter((_, index) => !correctIndices.includes(index));
                              return (
                                <div className="flex items-center gap-1">
                                  <span className="opacity-60 font-semibold">Wrong Pos:</span>
                                  <span className="text-warning-custom font-bold">
                                    {g.wrongPositionDigits.length} from ({remainingDigits.join(', ')})
                                  </span>
                                </div>
                              );
                            })()
                          ) : (
                            <div className="text-primary/40 italic">No wrong positions</div>
                          )}
                        </div>
                      </div>
                    ))}
                  {roomState.guessHistory.filter(g => g.playerId === myPlayer?._id).length === 0 && (
                    <p className="text-sm opacity-60 italic text-center py-4">No guesses submitted yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Center Panel: Interactive Guess and Turn Indicator */}
            <div className="glass-panel p-6 flex flex-col justify-between min-h-[400px]">
              <div className="text-center flex flex-col gap-4">
                <span className="text-xs uppercase font-extrabold opacity-60">Turn Indicator</span>
                <div className="flex items-center justify-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${roomState.currentTurnPlayerId === myPlayer?._id ? 'bg-success-custom animate-ping' : 'bg-red-500'}`} />
                  <h3 className="text-2xl font-bold">
                    {roomState.currentTurnPlayerId === myPlayer?._id ? 'Your Turn' : `${opponentPlayer?.name}'s Turn`}
                  </h3>
                </div>
              </div>

              {roomState.currentTurnPlayerId === myPlayer?._id ? (
                <div className="flex flex-col gap-4 my-8">
                  <input
                    type="text"
                    maxLength={4}
                    value={guessInput}
                    onChange={(e) => handleGuessInputChange(e.target.value.replace(/\D/g, ''))}
                    placeholder="Guess 4 digits..."
                    className="w-full text-center text-2xl font-extrabold tracking-widest py-3 border border-primary/20 bg-background-custom rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    onClick={handleSubmitGuess}
                    className="w-full bg-primary text-secondary font-extrabold py-3.5 rounded-xl hover:opacity-90 flex items-center justify-center gap-2 button-glow transition-all"
                  >
                    Submit Guess <Send className="w-4 h-4 fill-secondary" />
                  </button>
                </div>
              ) : (
                <div className="text-center my-8">
                  <p className="text-primary/70 font-semibold animate-pulse">Opponent is thinking...</p>
                  {isOpponentTyping && (
                    <p className="text-xs text-success-custom mt-2 animate-bounce">Opponent is typing...</p>
                  )}
                </div>
              )}

              <div className="text-center text-xs opacity-60">
                Correct positions are evaluated server-side.
              </div>
            </div>

            {/* Right Panel: Opponent Guesses & Info */}
            <div className="glass-panel p-6 flex flex-col gap-6">
              <div>
                <span className="text-xs uppercase font-extrabold opacity-60">Opponent Name</span>
                <div className="text-lg font-bold mt-1 text-primary flex items-center gap-2">
                  {opponentPlayer?.name || 'Player 2'}
                  <span className={`w-2 h-2 rounded-full ${opponentPlayer?.isOnline ? 'bg-success-custom' : 'bg-red-500'}`} />
                </div>
              </div>

              <div>
                <span className="text-xs uppercase font-extrabold opacity-60">Opponent's Guesses</span>
                <div className="flex flex-col gap-2 mt-3 overflow-y-auto max-h-[300px] pr-1">
                  {roomState.guessHistory
                    .filter(g => g.playerId === opponentPlayer?._id)
                    .map((g, idx) => (
                      <div key={idx} className="bg-background-custom p-3 rounded-xl border border-primary/10 flex flex-col gap-1 shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold tracking-widest text-lg text-primary">{g.guess}</span>
                          <span className="text-xs text-primary/50">Guess #{idx + 1}</span>
                        </div>
                        <div className="text-xs flex gap-2">
                          <span className="bg-success-custom/10 text-success-custom px-2 py-0.5 rounded-md font-bold">
                            {g.correctPosition.length} Correct Pos
                          </span>
                          <span className="bg-warning-custom/10 text-warning-custom px-2 py-0.5 rounded-md font-bold">
                            {g.wrongPositionDigits.length} Wrong Pos
                          </span>
                        </div>
                        {/* Detailed digit feedback */}
                        <div className="text-[11px] flex flex-col gap-1 border-t border-primary/5 pt-1.5 mt-1">
                          {g.correctPosition.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              <span className="opacity-60 font-semibold">Correct:</span>
                              {g.correctPosition.map((posInfo, pIdx) => (
                                <span key={pIdx} className="text-success-custom font-bold">
                                  {posInfo.digit} at Pos {posInfo.position}{pIdx < g.correctPosition.length - 1 ? ',' : ''}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="text-primary/40 italic">No correct positions</div>
                          )}
                          {g.wrongPositionDigits.length > 0 ? (
                            (() => {
                              const guessDigits = g.guess.split('');
                              const correctIndices = g.correctPosition.map(posInfo => posInfo.position - 1);
                              const remainingDigits = guessDigits.filter((_, index) => !correctIndices.includes(index));
                              return (
                                <div className="flex items-center gap-1">
                                  <span className="opacity-60 font-semibold">Wrong Pos:</span>
                                  <span className="text-warning-custom font-bold">
                                    {g.wrongPositionDigits.length} from ({remainingDigits.join(', ')})
                                  </span>
                                </div>
                              );
                            })()
                          ) : (
                            <div className="text-primary/40 italic">No wrong positions</div>
                          )}
                        </div>
                      </div>
                    ))}
                  {roomState.guessHistory.filter(g => g.playerId === opponentPlayer?._id).length === 0 && (
                    <p className="text-sm opacity-60 italic text-center py-4">No guesses submitted yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phase 5: Game Over */}
        {roomState.gameState === 'gameover' && (
          <div className="max-w-md mx-auto text-center flex flex-col gap-6">
            <div className="w-20 h-20 rounded-full bg-secondary/40 flex items-center justify-center mx-auto text-primary">
              <Award className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-3xl font-extrabold">
                {roomState.winnerId === myPlayer?._id ? '🎉 YOU WIN! 🎉' : '💀 YOU LOSE! 💀'}
              </h2>
              <p className="text-primary/70 text-sm mt-1.5">
                {roomState.winnerId === myPlayer?._id
                  ? 'Excellent deduction! You deciphered their secret code first.'
                  : 'Better luck next time. Protect your secret with more care!'}
              </p>
            </div>

            <div className="glass-panel p-6 flex flex-col gap-4">
              <button
                onClick={handlePlayAgain}
                className="w-full bg-primary text-secondary font-bold py-3.5 rounded-xl hover:opacity-90 flex items-center justify-center gap-2 transition-all button-glow"
              >
                <RotateCcw className="w-4 h-4" /> Play Again
              </button>
              <button
                onClick={handleQuit}
                className="w-full bg-transparent text-primary border border-primary/20 font-bold py-3.5 rounded-xl hover:bg-primary/5 transition-all"
              >
                Quit Game
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-xs opacity-60 py-4 max-w-7xl w-full mx-auto border-t border-primary/10">
        Secret 4 Premium Gaming System. Keep guessing, keep winning.
      </footer>
    </div>
  );
}
