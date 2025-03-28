import express from 'express';
import cluster from 'cluster';
import sticky from 'sticky-session';
import { createServer } from 'http';
import cors from 'cors';
import { config } from './src/config/config';
import mongoose from 'mongoose';
import os from 'os';
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
import connectDB from './src/config/db';
import globalErrorHandler from './src/dashboard/middleware/globalHandler';
import path from 'path';

const app = express();

// CORS
const corsOptions = {
  origin: config.allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
};

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors(corsOptions));

// Health check
app.get('/', async (req, res) => {
  const healthInfo = {
    status: 'Healthy',
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
    workers: cluster.isWorker ? `Worker ID: ${cluster.worker?.id}` : 'Master Process',
    database: {
      status: mongoose.connection.readyState === 1 ? 'Connected' : 'Not Connected',
      host: mongoose.connection.host
    },
    allowedOrigins: config.allowedOrigins
  };

  res.json(healthInfo);
});

// Serve static index.html on /play
// app.get('/play', (req, res) => {
//   res.sendFile(path.join(__dirname, 'src', 'public', 'index.html'));
// });
// 
// API routes
app.use('/api/company', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/payouts', checkUser, checkRole(['admin']), payoutRoutes);
app.use('/api/toggle', checkUser, checkRole(['admin']), toggleRoutes);
app.use('/api/session', sessionRoutes);

// Serve static files
// app.use(express.static(path.join(__dirname, 'src', 'public'), { index: false }));

// Global error handler
app.use(globalErrorHandler);

// Start server with sticky session
connectDB().then(() => {
  const server = createServer(app);
  if (!sticky.listen(server, Number(config.port))) {
    server.once('listening', () => {
      console.log(`🚀 Master process started on port ${config.port}`);
    });
  } else {
    setupWebSocket(server, corsOptions);
  }
}).catch((err) => {
  console.error('❌ Failed to connect to database:', err);
  process.exit(1);
});
