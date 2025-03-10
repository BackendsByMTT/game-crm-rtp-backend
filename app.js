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
const cluster_1 = __importDefault(require("cluster"));
const os_1 = __importDefault(require("os"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const sticky_1 = require("@socket.io/sticky");
const cluster_adapter_1 = require("@socket.io/cluster-adapter");
const svg_captcha_1 = __importDefault(require("svg-captcha"));
const http_errors_1 = __importDefault(require("http-errors"));
const db_1 = __importDefault(require("./src/config/db"));
// Import custom middleware and routes
const globalHandler_1 = __importDefault(require("./src/dashboard/middleware/globalHandler"));
const adminRoutes_1 = __importDefault(require("./src/dashboard/admin/adminRoutes"));
const userRoutes_1 = __importDefault(require("./src/dashboard/users/userRoutes"));
const transactionRoutes_1 = __importDefault(require("./src/dashboard/transactions/transactionRoutes"));
const gameRoutes_1 = __importDefault(require("./src/dashboard/games/gameRoutes"));
const payoutRoutes_1 = __importDefault(require("./src/dashboard/payouts/payoutRoutes"));
const ToggleRoutes_1 = __importDefault(require("./src/dashboard/Toggle/ToggleRoutes"));
const sessionRoutes_1 = __importDefault(require("./src/dashboard/session/sessionRoutes"));
// Import other utilities and controllers
const config_1 = require("./src/config/config");
const checkUser_1 = require("./src/dashboard/middleware/checkUser");
const checkRole_1 = require("./src/dashboard/middleware/checkRole");
const socket_1 = __importDefault(require("./src/socket"));
const numCPUs = os_1.default.cpus().length;
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, db_1.default)();
    if (cluster_1.default.isPrimary) {
        console.log(`primary ${process.pid} is running`);
        // try {
        //   console.log("Connected to database successfully");
        // } catch (error) {
        //   console.error("Database connection failed:", error);
        //   process.exit(1);
        // }
        const httpServer = (0, http_1.createServer)();
        (0, sticky_1.setupMaster)(httpServer, {
            loadBalancingMethod: "least-connection",
        });
        (0, cluster_adapter_1.setupPrimary)();
        const PORT = config_1.config.port;
        httpServer.listen(PORT, () => {
            console.log(`Primary load balancer running on port ${PORT}`);
        });
        for (let i = 0; i < numCPUs; i++) {
            cluster_1.default.fork();
        }
        cluster_1.default.on("exit", (worker) => {
            console.log(`Worker ${worker.process.pid} died. Restarting...`);
            cluster_1.default.fork();
        });
    }
    else {
        console.log(`Worker process ${process.pid} is running`);
        const app = (0, express_1.default)();
        // Middleware setup
        app.use(express_1.default.json({ limit: "25mb" }));
        app.use(express_1.default.urlencoded({ limit: "25mb", extended: true }));
        app.use((0, cors_1.default)({
            origin: [`*.${config_1.config.hosted_url_cors}`, "https://game-crm-rtp-backend.onrender.com"],
            credentials: true,
        }));
        // Set custom headers for CORS
        app.use((req, res, next) => {
            res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
            res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
            res.setHeader("Access-Control-Allow-Credentials", "true");
            if (req.method === "OPTIONS") {
                return res.sendStatus(200);
            }
            next();
        });
        // Health check route
        app.get("/", (req, res) => {
            res.status(200).json({
                uptime: process.uptime(),
                message: "OK",
                timestamp: new Date().toLocaleDateString(),
                worker: process.pid,
                numCPUs: numCPUs,
            });
        });
        // Captcha route
        app.get("/captcha", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const captcha = svg_captcha_1.default.create();
                if (captcha) {
                    req.session.captcha = captcha.text;
                    res.status(200).json({ data: captcha.data });
                }
                else {
                    throw (0, http_errors_1.default)(404, "Error Generating Captcha, Please refresh!");
                }
            }
            catch (error) {
                next(error);
            }
        }));
        // API routes
        app.use("/api/company", adminRoutes_1.default);
        app.use("/api/users", userRoutes_1.default);
        app.use("/api/transactions", transactionRoutes_1.default);
        app.use("/api/games", gameRoutes_1.default);
        app.use("/api/payouts", checkUser_1.checkUser, (0, checkRole_1.checkRole)(["admin"]), payoutRoutes_1.default);
        app.use("/api/toggle", checkUser_1.checkUser, (0, checkRole_1.checkRole)(["admin"]), ToggleRoutes_1.default);
        app.use("/api/session", sessionRoutes_1.default);
        // Initialize HTTP server
        const httpServer = (0, http_1.createServer)(app);
        // Initialize Socket.IO
        const io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
            },
            transports: ["websocket"],
            pingInterval: 25000,
            pingTimeout: 60000,
            allowEIO3: false
        });
        // Setup cluster adapter and worker
        io.adapter((0, cluster_adapter_1.createAdapter)());
        (0, sticky_1.setupWorker)(io);
        // Initialize Socket.IO logic
        (0, socket_1.default)(io);
        // Global error handler
        app.use(globalHandler_1.default);
        // Start the server
        // httpServer.listen(config.port, () => {
        //   console.log(`Worker process listening on port ${config.port}`);
        // });
    }
});
startServer().catch((error) => {
    console.error("Error starting server:", error);
});
