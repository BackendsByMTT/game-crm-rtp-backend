"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cluster_1 = __importDefault(require("cluster"));
const sticky_session_1 = __importDefault(require("sticky-session"));
const http_1 = require("http");
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./src/config/config");
const mongoose_1 = __importDefault(require("mongoose"));
const os_1 = __importDefault(require("os"));
const adminRoutes_1 = __importDefault(require("./src/dashboard/admin/adminRoutes"));
const userRoutes_1 = __importDefault(require("./src/dashboard/users/userRoutes"));
const transactionRoutes_1 = __importDefault(require("./src/dashboard/transactions/transactionRoutes"));
const gameRoutes_1 = __importDefault(require("./src/dashboard/games/gameRoutes"));
const checkUser_1 = require("./src/dashboard/middleware/checkUser");
const checkRole_1 = require("./src/dashboard/middleware/checkRole");
const payoutRoutes_1 = __importDefault(require("./src/dashboard/payouts/payoutRoutes"));
const ToggleRoutes_1 = __importDefault(require("./src/dashboard/Toggle/ToggleRoutes"));
const sessionRoutes_1 = __importDefault(require("./src/dashboard/session/sessionRoutes"));
const server_1 = require("./src/server");
const db_1 = __importDefault(require("./src/config/db"));
const globalHandler_1 = __importDefault(require("./src/dashboard/middleware/globalHandler"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
// CORS
const corsOptions = {
    origin: config_1.config.allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
};
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
app.use((0, cors_1.default)(corsOptions));
// Health check
app.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const healthInfo = {
        status: 'Healthy',
        uptime: `${Math.floor(process.uptime() / 60)} minutes`,
        timestamp: new Date().toLocaleString(),
        memoryUsage: {
            total: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
            used: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`
        },
        cpuLoad: {
            '1 min avg': os_1.default.loadavg()[0].toFixed(2),
            '5 min avg': os_1.default.loadavg()[1].toFixed(2),
            '15 min avg': os_1.default.loadavg()[2].toFixed(2)
        },
        platform: {
            os: os_1.default.platform(),
            architecture: os_1.default.arch(),
            nodeVersion: process.version
        },
        workers: cluster_1.default.isWorker ? `Worker ID: ${(_a = cluster_1.default.worker) === null || _a === void 0 ? void 0 : _a.id}` : 'Master Process',
        database: {
            status: mongoose_1.default.connection.readyState === 1 ? 'Connected' : 'Not Connected',
            host: mongoose_1.default.connection.host
        },
        allowedOrigins: config_1.config.allowedOrigins
    };
    res.json(healthInfo);
}));
// Serve static index.html on /play
app.get('/play', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, 'src', 'public', 'index.html'));
});
// 
// API routes
app.use('/api/company', adminRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/transactions', transactionRoutes_1.default);
app.use('/api/games', gameRoutes_1.default);
app.use('/api/payouts', checkUser_1.checkUser, (0, checkRole_1.checkRole)(['admin']), payoutRoutes_1.default);
app.use('/api/toggle', checkUser_1.checkUser, (0, checkRole_1.checkRole)(['admin']), ToggleRoutes_1.default);
app.use('/api/session', sessionRoutes_1.default);
// Serve static files
app.use(express_1.default.static(path_1.default.join(__dirname, 'src', 'public'), { index: false }));
// Global error handler
app.use(globalHandler_1.default);
// Start server with sticky session
(0, db_1.default)().then(() => {
    const server = (0, http_1.createServer)(app);
    if (!sticky_session_1.default.listen(server, Number(config_1.config.port))) {
        server.once('listening', () => {
            console.log(`🚀 Master process started on port ${config_1.config.port}`);
        });
    }
    else {
        (0, server_1.setupWebSocket)(server, corsOptions);
    }
}).catch((err) => {
    console.error('❌ Failed to connect to database:', err);
    process.exit(1);
});
