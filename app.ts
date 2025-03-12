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
import { setupWebSocket } from './src/server';

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
  setupWebSocket(server, corsOptions);
}