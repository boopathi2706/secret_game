import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { HelpCircle, Play, Users, Award, ShieldAlert, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function LandingPage() {
  const { isConnected } = useSocket();
  const [playerName, setPlayerName] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [showHowTo, setShowHowTo] = useState(false);
  const navigate = useNavigate();

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      toast.error('Please enter your name.');
      return;
    }
    navigate('/game', { state: { playerName, action: 'create' } });
  };

  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      toast.error('Please enter your name.');
      return;
    }
    if (!roomIdInput.trim()) {
      toast.error('Please enter a Room ID.');
      return;
    }
    navigate('/game', { state: { playerName, action: 'join', roomId: roomIdInput.toUpperCase().trim() } });
  };

  return (
    <div className="min-h-screen bg-background-custom text-primary flex flex-col items-center justify-between p-6 relative overflow-hidden select-none">
      {/* Background Animated Gradient / Shapes */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-secondary/20 blur-3xl" />

      {/* Header / Connectivity status */}
      <header className="w-full max-w-4xl flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
            <span className="font-bold text-xl text-secondary">S4</span>
          </div>
          <span className="font-bold text-2xl tracking-wide hidden sm:inline">SECRET 4</span>
        </div>

        <div className="flex items-center gap-3 bg-white/70 backdrop-blur-md px-4 py-2 rounded-full border border-primary/10 shadow-sm">
          {isConnected ? (
            <>
              <Wifi className="w-4 h-4 text-success-custom animate-pulse" />
              <span className="text-xs font-semibold text-success-custom">SERVER ONLINE</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-danger-custom" />
              <span className="text-xs font-semibold text-danger-custom">SERVER OFFLINE</span>
            </>
          )}
        </div>
      </header>

      {/* Main hero section */}
      <main className="w-full max-w-4xl flex flex-col md:flex-row items-center justify-center gap-12 my-auto z-10">
        {/* Left column: Branding & Controls */}
        <div className="flex-1 flex flex-col gap-6 text-center md:text-left">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-6xl font-bold leading-tight"
          >
            Real-Time <br />
            <span className="text-success-custom">Mind Duel</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-primary/75 max-w-md"
          >
            A high-stakes 4-digit number guessing battle. Think fast, guess precisely, and protect your secret code.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="glass-panel p-6 w-full max-w-md mx-auto md:mx-0 flex flex-col gap-4"
          >
            <div>
              <label className="block text-left text-sm font-semibold mb-1 opacity-70">Player Name</label>
              <input
                type="text"
                placeholder="Enter nickname..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={15}
                className="w-full px-4 py-3 rounded-xl border border-primary/20 bg-background-custom focus:outline-none focus:ring-2 focus:ring-primary/40 font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <button
                onClick={handleCreateRoom}
                className="bg-primary text-secondary px-4 py-3 rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md button-glow"
              >
                <Play className="w-5 h-5 fill-secondary" /> Create Room
              </button>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Room ID"
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value)}
                  className="w-2/3 px-3 py-3 rounded-xl border border-primary/20 bg-background-custom text-center font-bold tracking-widest uppercase focus:outline-none"
                />
                <button
                  onClick={handleJoinRoom}
                  className="w-1/3 bg-success-custom text-white rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center"
                >
                  Join
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right column: Graphic & Help card */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="w-72 h-72 rounded-[32px] bg-primary flex flex-col items-center justify-center relative shadow-2xl p-8"
          >
            <div className="absolute top-4 left-4 text-secondary/30 font-bold text-6xl">?</div>
            <div className="absolute bottom-4 right-4 text-secondary/30 font-bold text-6xl">?</div>

            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="text-secondary font-bold text-7xl tracking-widest"
            >
              1290
            </motion.div>

            <button
              onClick={() => setShowHowTo(true)}
              className="mt-6 flex items-center gap-2 bg-secondary text-primary font-bold px-4 py-2 rounded-full text-sm hover:opacity-95 transition-all shadow-md"
            >
              <HelpCircle className="w-4 h-4" /> How to Play
            </button>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-xs opacity-60 z-10 py-4">
        © 2026 Secret 4. Built with React & WebSockets.
      </footer>

      {/* How to Play Dialog */}
      <AnimatePresence>
        {showHowTo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-primary/45 backdrop-blur-md flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-xl w-full shadow-2xl relative overflow-hidden"
            >
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <HelpCircle className="w-6 h-6 text-success-custom" /> Rules of the Duel
              </h2>

              <div className="space-y-4 text-sm leading-relaxed text-primary/80 overflow-y-auto max-h-[60vh] pr-2">
                <p>
                  1. <strong>Set your secret:</strong> Enter a secret 4-digit code. Keep it secret from your opponent.
                </p>
                <p>
                  2. <strong>Toss decision:</strong> A quick odd/even coin flip decides who gets to guess first.
                </p>
                <p>
                  3. <strong>Make your guess:</strong> On your turn, submit a 4-digit guess of what your opponent's secret is.
                </p>
                <p>
                  4. <strong>Analyze feedback:</strong> After each guess, the system evaluates the guess:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <span className="text-success-custom font-bold">Exact Positions:</span> Tells you which digits are perfectly correct and in the correct slot.
                  </li>
                  <li>
                    <span className="text-warning-custom font-bold">Wrong Positions:</span> Tells you which digits are present in the secret code, but placed in the wrong slot.
                  </li>
                </ul>
                <p>
                  5. <strong>Win condition:</strong> The first player to pinpoint all 4 digits in their exact slots wins the game!
                </p>
              </div>

              <button
                onClick={() => setShowHowTo(false)}
                className="mt-6 w-full bg-primary text-secondary font-bold py-3 rounded-xl hover:opacity-90 transition-all"
              >
                Let's Play
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
