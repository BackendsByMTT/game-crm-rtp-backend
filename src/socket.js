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
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const userModel_1 = require("./dashboard/users/userModel");
const config_1 = require("./config/config");
const Player_1 = __importDefault(require("./Player"));
const Manager_1 = __importDefault(require("./Manager"));
const sessionManager_1 = require("./dashboard/session/sessionManager");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const redisClient_1 = __importDefault(require("./redisClient"));
const subClient = redisClient_1.default.duplicate();
const verifySocketToken = (socket) => {
    return new Promise((resolve, reject) => {
        const token = socket.handshake.auth.token;
        if (token) {
            jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret, (err, decoded) => {
                if (err) {
                    console.error("Token verification failed:", err.message);
                    reject(new Error("You are not authenticated"));
                }
                else if (!decoded || !decoded.username) {
                    reject(new Error("Token does not contain required fields"));
                }
                else {
                    resolve(decoded);
                }
            });
        }
        else {
            reject(new Error("No authentication token provided"));
        }
    });
};
const getPlayerDetails = (username) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const player = yield userModel_1.Player.findOne({ username }).populate("createdBy", "username");
    if (player) {
        return {
            credits: player.credits,
            status: player.status,
            managerName: ((_a = player.createdBy) === null || _a === void 0 ? void 0 : _a.username) || null
        };
    }
    throw new Error("Player not found");
});
const getManagerDetails = (username) => __awaiter(void 0, void 0, void 0, function* () {
    const manager = yield userModel_1.User.findOne({ username });
    if (manager) {
        return { credits: manager.credits, status: manager.status };
    }
    throw new Error("Manager not found");
});
const handlePlayerConnection = (socket, decoded, userAgent) => __awaiter(void 0, void 0, void 0, function* () {
    const username = decoded.username;
    const platformId = socket.handshake.auth.platformId;
    const origin = socket.handshake.auth.origin;
    const gameId = socket.handshake.auth.gameId;
    const { credits, status, managerName } = yield getPlayerDetails(username);
    let existingPlayer = sessionManager_1.sessionManager.getPlayerPlatform(username);
    if (existingPlayer) {
        // Platform connection handling
        if (origin) {
            if (existingPlayer.platformData.platformId !== platformId) {
                console.log(`Duplicate platform detected for ${username}`);
                socket.emit("alert", "NewTab");
                socket.disconnect(true);
                return;
            }
            if (existingPlayer.platformData.socket && existingPlayer.platformData.socket.connected) {
                console.log(`Platform already connected for ${username}`);
                socket.emit("alert", "Platform already connected.");
                socket.disconnect(true);
                return;
            }
            console.log(`Reinitializing platform connection for ${username}`);
            existingPlayer.initializePlatformSocket(socket);
            existingPlayer.sendAlert(`Platform reconnected for ${username}`, false);
            return;
        }
        // Game connection handling
        if (gameId || !gameId) {
            if (!existingPlayer.platformData.socket || !existingPlayer.platformData.socket.connected) {
                console.log("Platform connection required before joining a game.");
                socket.emit("internalError" /* messageType.ERROR */, "Platform connection required before joining a game.");
                socket.disconnect(true);
                return;
            }
            console.log("Game connection attempt detected, ensuring platform stability");
            yield existingPlayer.updateGameSocket(socket);
            existingPlayer.sendAlert(`Game initialized for ${username} in game ${gameId}`);
            return;
        }
    }
    // New platform connection
    if (origin) {
        const newUser = new Player_1.default(username, decoded.role, status, credits, userAgent, socket, managerName);
        newUser.platformData.platformId = platformId;
        newUser.sendAlert(`Player initialized for ${username} on platform ${origin}`, false);
        return;
    }
    // Game connection without existing platform connection
    if (process.env.NODE_ENV === "testing") {
        console.log("Testing environment detected. Creating platform socket for the player.");
        const mockPlatformSocket = {
            handshake: { auth: { platformId: `test-platform-${username}` } },
            connected: true,
            emit: socket.emit.bind(socket),
            disconnect: socket.disconnect.bind(socket),
            on: socket.on.bind(socket),
        };
        const testPlayer = new Player_1.default(username, decoded.role, status, credits, userAgent, mockPlatformSocket, managerName);
        testPlayer.platformData.platformId = `test-platform-${username}`;
        yield testPlayer.updateGameSocket(socket);
        return;
    }
    // Invalid connection attempt
    socket.emit("internalError" /* messageType.ERROR */, "Invalid connection attempt.");
    socket.disconnect(true);
});
const handleManagerConnection = (socket, decoded, userAgent) => __awaiter(void 0, void 0, void 0, function* () {
    const username = decoded.username;
    const role = decoded.role;
    const { credits } = yield getManagerDetails(username);
    console.log("MANAGER CONNECTION");
    let existingManager = sessionManager_1.sessionManager.getActiveManagerByUsername(username);
    if (existingManager) {
        console.log(`Reinitializing manager ${username}`);
        if (existingManager.socketData.reconnectionTimeout) {
            clearTimeout(existingManager.socketData.reconnectionTimeout);
        }
        existingManager.initializeManager(socket);
        socket.emit("alert" /* messageType.ALERT */, `Manager ${username} has been reconnected.`);
    }
    else {
        const newManager = new Manager_1.default(username, credits, role, userAgent, socket);
        sessionManager_1.sessionManager.addManager(username, newManager);
        socket.emit("alert" /* messageType.ALERT */, `Manager ${username} has been connected.`);
    }
    // Send all active players to the manager upon connection
    // const activeUsersData = Array.from(sessionManager.getPlatformSessions().values()).map(player => {
    //     const platformSession = sessionManager.getPlayerPlatform(player.playerData.username);
    //     return platformSession?.getSummary() || {};
    // });
    // socket.emit("activePlayers", activeUsersData);
});
const socketController = (io) => {
    io.adapter((0, redis_adapter_1.createAdapter)(redisClient_1.default, subClient));
    // Token verification middleware
    io.use((socket, next) => __awaiter(void 0, void 0, void 0, function* () {
        const userAgent = socket.request.headers['user-agent'];
        try {
            const decoded = yield verifySocketToken(socket);
            socket.decoded = Object.assign({}, decoded);
            socket.userAgent = userAgent;
            next();
        }
        catch (error) {
            console.error("Authentication error:", error.message);
            next(error);
        }
    }));
    io.on("connection", (socket) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const decoded = socket.decoded;
            const userAgent = socket.userAgent;
            const role = decoded.role;
            if (role === "player") {
                yield handlePlayerConnection(socket, decoded, userAgent);
            }
            else if (['admin', 'supermaster', 'master', 'distributor', 'subdistributor', 'store'].includes(role)) {
                yield handleManagerConnection(socket, decoded, userAgent);
            }
            else {
                console.error("Unsupported role : ", role);
                socket.disconnect(true);
            }
        }
        catch (error) {
            console.error("An error occurred during socket connection:", error.message);
            socket.emit("alert", "ForcedExit");
            socket.disconnect(true);
        }
    }));
    // Error handling middleware
    io.use((socket, next) => {
        socket.on('error', (err) => {
            console.error('Socket Error:', err);
            socket.disconnect(true);
        });
        next();
    });
};
exports.default = socketController;
