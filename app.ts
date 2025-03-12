import express from 'express';
import cluster from 'cluster';
import sticky from 'sticky-session';
import { createServer } from 'http';
import cors from 'cors';
import { config } from './src/config/config';
import mongoose from 'mongoose';
import os from 'os';
import session, { SessionData } from 'express-session';
import svgCaptcha from 'svg-captcha';
import adminRoutes from './src/dashboard/admin/adminRoutes';
import userRoutes from './src/dashboard/users/userRoutes';
import transactionRoutes from './src/dashboard/transactions/transactionRoutes';
import gameRoutes from './src/dashboard/games/gameRoutes';
import { checkUser } from './src/dashboard/middleware/checkUser';
import { checkRole } from './src/dashboard/middleware/checkRole';
import payoutRoutes from './src/dashboard/payouts/payoutRoutes';
import toggleRoutes from './src/dashboard/Toggle/ToggleRoutes';
import sessionRoutes from './src/dashboard/session/sessionRoutes';
import { Server } from 'socket.io';

interface CustomSessionData extends SessionData {
  captcha?: string;
}

const app = express();

// CORS for WebSockets and Express API
const corsOptions = {
  origin: config.allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // Allow only major HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'], // Allow essential headers
  credentials: true // Allow cookies and Authorization headers
};

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors(corsOptions));
app.use(session({
  secret: config.jwtSecret,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to `true` if using HTTPS
}));

// Health check endpoint
app.get('/health', async (req, res) => {
  const healthInfo = {
    status: 'Healthy', // Professional yet clear
    uptime: `${Math.floor(process.uptime() / 60)} minutes`,
    timestamp: new Date().toLocaleString(),
    memoryUsage: {
      total: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
      used: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`
    },
    cpuLoad: {
      '1 min avg': os.loadavg()[0].toFixed(2),
      '5 min avg': os.loadavg()[1].toFixed(2),
      '15 min avg': os.loadavg()[2].toFixed(2)
    },
    platform: {
      os: os.platform(),
      architecture: os.arch(),
      nodeVersion: process.version
    },
    workers: cluster.isWorker ? `Worker ID: ${cluster.worker.id}` : 'Master Process',
    database: {
      status: mongoose.connection.readyState === 1 ? 'Connected' : 'Not Connected',
      host: mongoose.connection.host
    },
    allowedOrigins: config.allowedOrigins
  };

  res.json(healthInfo);
});

// CAPTCHA endpoint
app.get('/captcha', (req, res) => {
  const captcha = svgCaptcha.create({
    size: 6, // Length of the captcha text
    noise: 3, // Number of noise lines
    color: true, // Colored text
    background: '#f4f4f4', // Light background
    ignoreChars: '0oO1Il', // Avoid confusing characters
    height: 50 // Height of the image
  });

  (req.session as CustomSessionData).captcha = captcha.text; // Store CAPTCHA text in session

  res.type('svg').send(captcha.data); // Return SVG image
});

// Serve static files
app.use(express.static('public'));

// API routes
app.use('/api/company', adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/payouts", checkUser, checkRole(["admin"]), payoutRoutes);
app.use("/api/toggle", checkUser, checkRole(["admin"]), toggleRoutes);
app.use("/api/session", sessionRoutes);

// Serve the HTML file for the frontend
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: './' });
});

const server = createServer(app);

if (!sticky.listen(server, Number(config.port))) {
  // Master process
  server.once('listening', () => {
    console.log(`🚀 Server started on port ${config.port}`);
  });
} else {
  // Worker process (handles WebSockets)
  const io = new Server(server, {
    cors: corsOptions
  });

  // User tracking
  const connectedUsers = new Map();

  // RTP (Return to Player) settings - controls win probability
  const gameSettings = {
    defaultRTP: 0.95, // 95% return to player
    winProbability: 0.45, // Base chance of winning
  };

  // **Platform Namespace (Handles User Login, Profile, etc.)**
  const platformNamespace = io.of('/platform');
  platformNamespace.on('connection', (socket) => {
    console.log(`👤 User connected to /platform (ID: ${socket.id}, Worker: ${cluster.worker.id})`);

    socket.on('login', (data) => {
      console.log(`🔑 User Login Attempt:`, data);
      socket.emit('login-success', { message: 'Welcome to the platform!' });
    });

    socket.on('disconnect', () => {
      console.log(`👤 User disconnected from /platform (ID: ${socket.id})`);
    });
  });

  // **Game Namespace (Handles Slot Games, Spins, Bets, etc.)**
  const gameNamespace = io.of('/game');
  gameNamespace.on('connection', (socket) => {
    console.log(`🎮 User connected to /game (ID: ${socket.id}, Worker: ${cluster.worker.id})`);

    socket.on('join', (data) => {
      const { username } = data;
      console.log(`👤 User ${username} joined the game`);

      // Store user info
      connectedUsers.set(socket.id, {
        username,
        balance: 1000, // Initial balance
        spins: 0,
        wins: 0,
        losses: 0
      });
    });

    socket.on('spin', (data) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      // Get bet amount from request or use default
      const betAmount = data.bet || 10;

      // Track spin activity
      user.spins++;

      // Calculate outcome based on RTP settings
      const isWin = Math.random() <= gameSettings.winProbability;

      // Update user stats
      if (isWin) {
        user.wins++;
        user.balance += betAmount * 5; // 5x win multiplier
      } else {
        user.losses++;
        user.balance -= betAmount;
      }

      console.log(`🎰 Spin result for ${user.username}: ${isWin ? 'Win' : 'Lose'} : ${cluster.worker.id}`);

      // Send result back to client
      socket.emit('spin-result', {
        result: isWin ? 'Win' : 'Lose',
        balance: user.balance,
        stats: {
          totalSpins: user.spins,
          wins: user.wins,
          losses: user.losses
        }
      });
    });

    socket.on('disconnect', () => {
      console.log(`🎮 User disconnected from /game (ID: ${socket.id})`);
      // Clean up user data
      connectedUsers.delete(socket.id);
    });
  });
  console.log(`⚡ WebSocket server running on worker ${cluster.worker.id}`);
}