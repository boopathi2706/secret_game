import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import GameRoom from './pages/GameRoom';
import { SocketProvider } from './context/SocketContext';
import { Toaster } from 'react-hot-toast';

export default function App() {
  return (
    <SocketProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/game" element={<GameRoom />} />
          {/* Catch all route - fallback redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster position="top-center" reverseOrder={false} />
    </SocketProvider>
  );
}
