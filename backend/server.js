require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const connectDB = require('./db');

const app = express();
const server = http.createServer(app);

// Connect Database
connectDB();

// Normalize CORS origin to strip trailing slash if present
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.replace(/\/$/, '')
  : 'http://localhost:5173';

// Middleware
app.use(helmet());
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Basic HTTP Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Secret 4 Backend Running' });
});

// Setup socket.io
const io = socketIo(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Import and bind socket events
require('./socketHandler')(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
