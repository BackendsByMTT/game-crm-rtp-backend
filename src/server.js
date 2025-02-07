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
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const globalHandler_1 = __importDefault(require("./dashboard/middleware/globalHandler"));
const adminRoutes_1 = __importDefault(require("./dashboard/admin/adminRoutes"));
const userRoutes_1 = __importDefault(require("./dashboard/users/userRoutes"));
const transactionRoutes_1 = __importDefault(require("./dashboard/transactions/transactionRoutes"));
const gameRoutes_1 = __importDefault(require("./dashboard/games/gameRoutes"));
const config_1 = require("./config/config");
const svg_captcha_1 = __importDefault(require("svg-captcha"));
const http_errors_1 = __importDefault(require("http-errors"));
const socket_1 = __importDefault(require("./socket"));
const payoutRoutes_1 = __importDefault(require("./dashboard/payouts/payoutRoutes"));
const checkUser_1 = require("./dashboard/middleware/checkUser");
const ToggleRoutes_1 = __importDefault(require("./dashboard/Toggle/ToggleRoutes"));
const checkRole_1 = require("./dashboard/middleware/checkRole");
const sessionRoutes_1 = __importDefault(require("./dashboard/session/sessionRoutes"));
const app = (0, express_1.default)();
//Cloudinary configs
app.use(express_1.default.json({ limit: "25mb" }));
app.use(express_1.default.urlencoded({ limit: "25mb", extended: true }));
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});
app.use((0, cors_1.default)({
    origin: [`*.${config_1.config.hosted_url_cors}`, 'https://game-crm-rtp-backend.onrender.com']
}));
const server = (0, http_1.createServer)(app);
// HEALTH ROUTES
app.get("/", (req, res, next) => {
    const health = {
        uptime: process.uptime(),
        message: "OK",
        timestamp: new Date().toLocaleDateString(),
    };
    res.status(200).json(health);
});
app.get("/captcha", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        var captcha = svg_captcha_1.default.create();
        if (captcha) {
            req.session.captcha = captcha.text;
            res.status(200).json(captcha.data);
        }
        else {
            throw (0, http_errors_1.default)(404, "Error Generating Captcha, Please refresh!");
        }
    }
    catch (error) {
        next(error);
    }
}));
app.use("/api/company", adminRoutes_1.default);
app.use("/api/users", userRoutes_1.default);
app.use("/api/transactions", transactionRoutes_1.default);
app.use("/api/games", gameRoutes_1.default);
app.use("/api/payouts", checkUser_1.checkUser, (0, checkRole_1.checkRole)(["admin"]), payoutRoutes_1.default);
app.use("/api/toggle", checkUser_1.checkUser, (0, checkRole_1.checkRole)(["admin"]), ToggleRoutes_1.default);
app.use("/api/session", sessionRoutes_1.default);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});
(0, socket_1.default)(io);
app.use(globalHandler_1.default);
exports.default = server;
