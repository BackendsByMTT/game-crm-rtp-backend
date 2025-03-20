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
const sessionManager_1 = require("./dashboard/session/sessionManager");
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
    try {
        const username = decoded.username;
        const platformId = socket.handshake.auth.platformId;
        const origin = socket.handshake.auth.origin;
        const gameId = socket.handshake.auth.gameId;
        console.log(`Handling player connection for user ${username}`);
        console.log(`Platform ID: ${platformId}, Origin: ${origin}, Game ID: ${gameId}`);
        const { credits, status, managerName } = yield getPlayerDetails(username);
        console.log(`Player details - Credits: ${credits}, Status: ${status}, Manager Name: ${managerName}`);
        let existingPlayer = yield sessionManager_1.sessionManager.getPlaygroundUser(username);
        console.log(`Existing player: ${existingPlayer ? 'Yes' : 'No'}`);
        if (existingPlayer) {
            // Platform connection handling
            if (origin) {
                try {
                    console.log(`Handling platform connection for user ${username}`);
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
                catch (error) {
                    console.error(`Error handling platform connection for user ${username}:`, error);
                    socket.emit("internalError" /* messageType.ERROR */, `Error handling platform connection for user ${username}: ${error.message}`);
                    socket.disconnect(true);
                }
            }
            // Game connection handling
            if (gameId || !gameId) {
                try {
                    console.log(`Handling game connection for user ${username}`);
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
                catch (error) {
                    console.error(`Error handling game connection for user ${username}:`, error);
                    socket.emit("internalError" /* messageType.ERROR */, `Error handling game connection for user ${username}: ${error.message}`);
                    socket.disconnect(true);
                }
            }
        }
        // New platform connection
        if (origin) {
            try {
                console.log(`New platform connection for user ${username}`);
                const newUser = new Player_1.default(username, decoded.role, status, credits, userAgent, socket, managerName);
                newUser.platformData.platformId = platformId;
                newUser.sendAlert(`Player initialized for ${username} on platform ${origin}`, false);
                return;
            }
            catch (error) {
                console.error(`Error handling new platform connection for user ${username}:`, error);
                socket.emit("internalError" /* messageType.ERROR */, `Error handling new platform connection for user ${username}: ${error.message}`);
                socket.disconnect(true);
            }
        }
        // Game connection without existing platform connection
        if (process.env.NODE_ENV === "testing") {
            try {
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
            catch (error) {
                console.error(`Error handling game connection in testing environment for user ${username}:`, error);
                socket.emit("internalError" /* messageType.ERROR */, `Error handling game connection in testing environment for user ${username}: ${error.message}`);
                socket.disconnect(true);
            }
        }
        // Invalid connection attempt
        console.log(`Invalid connection attempt for user ${username}`);
        socket.emit("internalError" /* messageType.ERROR */, "Invalid connection attempt.");
        socket.disconnect(true);
    }
    catch (error) {
        console.error(`Error in handlePlayerConnection for user ${(decoded === null || decoded === void 0 ? void 0 : decoded.username) || 'unknown'}:`, error);
        socket.emit("internalError" /* messageType.ERROR */, `Error in handlePlayerConnection for user ${(decoded === null || decoded === void 0 ? void 0 : decoded.username) || 'unknown'}: ${error.message}`);
        socket.disconnect(true);
    }
});
;
const handleManagerConnection = (socket, decoded, userAgent) => __awaiter(void 0, void 0, void 0, function* () {
});
const socketController = (io) => {
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
