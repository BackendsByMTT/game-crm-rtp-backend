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
exports.sessionManager = void 0;
const redis_1 = require("../../config/redis");
const Manager_1 = __importDefault(require("../../Manager"));
const Player_1 = __importDefault(require("../../Player"));
const userModel_1 = require("../users/userModel");
const gameSession_1 = require("./gameSession");
const sessionModel_1 = require("./sessionModel");
const events_1 = require("../../utils/events");
const gameModel_1 = require("../games/gameModel");
const SESSION_EXPIRATION_TIME = 3600; // 1 hour in seconds
class SessionManager {
    constructor() {
        this.playground = new Map();
        this.control = new Map();
        this.getPlayerDetails = (username) => __awaiter(this, void 0, void 0, function* () {
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
        this.getManagerDetails = (username) => __awaiter(this, void 0, void 0, function* () {
            const manager = yield userModel_1.User.findOne({ username });
            if (manager) {
                return { credits: manager.credits, status: manager.status };
            }
            throw new Error("Manager not found");
        });
        // PLAYGROUND
        this.startSession = (username, role, userAgent, socket) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                // 🚀 Get player details
                const playerDetails = yield this.getPlayerDetails(username);
                if (!playerDetails) {
                    socket.emit("error", "Player not found");
                    socket.disconnect();
                    return;
                }
                // ⚠️ Prevent duplicate sessions
                if (this.playground.has(username)) {
                    socket.emit("error", "Player session already exists");
                    socket.disconnect();
                    return;
                }
                // ✅ Create Player Instance
                const player = new Player_1.default(username, role, playerDetails.status, playerDetails.credits, userAgent, socket, playerDetails.managerName);
                this.playground.set(username, player);
                // 📌 Store in Redis
                const sessionData = player.getSummary();
                yield redis_1.redisClient.pubClient.hSet(events_1.Channels.PLAYGROUND(username), {
                    "playerId": sessionData.playerId,
                    "status": sessionData.status,
                    "initialCredits": ((_a = sessionData.initialCredits) === null || _a === void 0 ? void 0 : _a.toString()) || "0",
                    "currentCredits": ((_b = sessionData.currentCredits) === null || _b === void 0 ? void 0 : _b.toString()) || "0",
                    "managerName": sessionData.managerName || "",
                    "entryTime": sessionData.entryTime.toISOString(),
                    "exitTime": sessionData.exitTime ? sessionData.exitTime.toISOString() : "null",
                    "currentRTP": ((_c = sessionData.currentRTP) === null || _c === void 0 ? void 0 : _c.toString()) || "0",
                    "currentGame": sessionData.currentGame ? JSON.stringify(sessionData.currentGame) : "null",
                    "userAgent": sessionData.userAgent || "",
                    "platformId": ((_d = sessionData.platformId) === null || _d === void 0 ? void 0 : _d.toString()) || "",
                });
                yield redis_1.redisClient.pubClient.expire(events_1.Channels.PLAYGROUND(username), SESSION_EXPIRATION_TIME);
                // 📌 Save in MongoDB
                yield new sessionModel_1.PlatformSessionModel(sessionData).save();
                // 🔔 Notify & Start Heartbeat
                yield this.notify(username, events_1.Events.PLAYGROUND_ENTER, sessionData);
                this.startSessionHeartbeat(player);
                console.log(`✅ Playground session stored for ${username}`);
            }
            catch (error) {
                console.error(`Failed to start playground session for player: ${username}`, error);
            }
        });
        this.endSession = (username) => __awaiter(this, void 0, void 0, function* () {
            try {
                const player = this.playground.get(username);
                if (!player) {
                    console.warn(`⚠️ No active session found for ${username}`);
                    return;
                }
                // ❌ Stop Heartbeat
                this.stopSessionHeartbeat(player);
                // ❌ Remove from in-memory session
                this.playground.delete(username);
                // ❌ Remove from Redis
                yield redis_1.redisClient.pubClient.del(events_1.Channels.PLAYGROUND(username));
                // ❌ Notify control users about removal
                yield this.notify(username, events_1.Events.PLAYGROUND_EXIT, player.getSummary());
                // ❌ Update MongoDB
                yield sessionModel_1.PlatformSessionModel.updateOne({ playerId: player.playerData.username, entryTime: player.entryTime }, { $set: { exitTime: new Date() } });
                console.log(`✅ Playground session ended for ${username}`);
            }
            catch (error) {
                console.error(`Failed to delete playground session for player: ${username}`, error);
            }
        });
        this.startSessionHeartbeat = (player) => {
            if (!player || !player.platformData.socket)
                return;
            // ✅ Stop any existing heartbeat before starting a new one
            this.stopSessionHeartbeat(player);
            // ✅ Start a new heartbeat interval
            player.platformData.heartbeatInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                if (!player.platformData.socket || !player.platformData.socket.connected) {
                    this.stopSessionHeartbeat(player);
                    return;
                }
                // ✅ Sync credit balance with Redis
                yield redis_1.redisClient.pubClient.hSet(events_1.Channels.PLAYGROUND(player.playerData.username), {
                    "currentCredits": player.playerData.credits.toString()
                });
                // ✅ Send updated balance to the client
                player.sendData({ type: events_1.Events.PLAYGROUND_CREDITS, payload: { credits: player.playerData.credits } }, "platform");
                // Send a ping to the client
                player.platformData.socket.emit('ping');
            }), 5000); // Update every 5 seconds
        };
        this.stopSessionHeartbeat = (player) => {
            if (player.platformData.heartbeatInterval) {
                clearInterval(player.platformData.heartbeatInterval);
                player.platformData.heartbeatInterval = null;
                console.log(`💔 Stopped heartbeat for ${player.playerData.username}`);
            }
        };
        // GAME
        this.startGame = (username, gameId, socket) => __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`🎰 Player ${username} entering game: ${gameId}`);
                const player = this.playground.get(username);
                if (!player) {
                    console.warn(`⚠️ No active session found for ${username}`);
                    return;
                }
                if (player.currentGameSession) {
                    console.warn(`⚠️ Player ${username} already in game: ${player.currentGameSession.gameId}`);
                    return;
                }
                const gameName = yield this.getGameNameByTagName(gameId);
                // ✅ Create and assign the game session
                player.currentGameSession = new gameSession_1.GameSession(username, gameId, player.playerData.credits);
                player.currentGameSession.gameName = gameName;
                console.log(`✅ Created game session for ${username}: ${gameId} (${gameName})`);
                // ✅ Initialize the game socket
                player.updateGameSocket(socket);
                player.currentGameSession.on(events_1.Events.PLAYGROUND_GAME_SPIN, (summary) => __awaiter(this, void 0, void 0, function* () {
                    yield this.notify(player.playerData.username, events_1.Events.PLAYGROUND_GAME_SPIN, summary);
                }));
                // ✅ Store the game session in Redis
                console.log("SYMNMN : ", player.currentGameSession.getSummary());
                yield redis_1.redisClient.pubClient.hSet(events_1.Channels.PLAYGROUND(username), {
                    "currentGame": JSON.stringify(player.currentGameSession.getSummary())
                });
                yield this.notify(username, events_1.Events.PLAYGROUND_GAME_ENTER, player.currentGameSession.getSummary());
                console.log(`✅ Game session started for ${username}: ${gameId} (${player.currentGameSession.gameName})`);
            }
            catch (error) {
                console.error(`❌ Failed to start game session for ${username}:`, error);
            }
        });
        this.endGame = (username) => __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`🔍 Checking endGame() call for ${username}`);
                console.trace(); // Logs the full stack trace
                const player = this.playground.get(username);
                if (!player || !player.currentGameSession) {
                    console.warn(`⚠️ No active game session found for ${username}`);
                    return;
                }
                console.log(`🚨 Ending game for ${username}: ${player.currentGameSession.gameId}`);
                // 🛑 Ensure game session data is valid before updating DB
                if (player.currentGameSession) {
                    player.currentGameSession.exitTime = new Date();
                    player.currentGameSession.creditsAtExit = player.playerData.credits;
                    player.currentGameSession.sessionDuration = Math.abs(player.currentGameSession.exitTime.getTime() - player.currentGameSession.entryTime.getTime());
                    // 🗑️ Remove from Redis
                    yield redis_1.redisClient.pubClient.hDel(events_1.Channels.PLAYGROUND(username), "currentGame");
                    // 📝 Store game session in MongoDB
                    yield sessionModel_1.PlatformSessionModel.updateOne({ playerId: player.playerData.username, entryTime: player.entryTime }, {
                        $push: { gameSessions: player.currentGameSession.getSummary() },
                        $set: { currentRTP: player.currentRTP }
                    });
                }
                // 🧹 Clear `currentGameData`
                player.currentGameData = {
                    username: player.playerData.username,
                    gameId: null,
                    gameSettings: null,
                    currentGameManager: null,
                    session: null,
                    socket: null,
                    heartbeatInterval: setInterval(() => { }, 0),
                    sendMessage: player.sendMessage.bind(player),
                    sendError: player.sendError.bind(player),
                    sendAlert: player.sendAlert.bind(player),
                    updatePlayerBalance: player.updatePlayerBalance.bind(player),
                    deductPlayerBalance: player.deductPlayerBalance.bind(player),
                    getPlayerData: () => player.playerData,
                };
                // 🔄 Reset current game session
                player.currentGameSession = null;
                yield this.notify(player.playerData.username, events_1.Events.PLAYGROUND_GAME_EXIT, username);
                console.log(`✅ Successfully ended game session for ${username}`);
            }
            catch (error) {
                console.error(`❌ Failed to end game session for player: ${username}`, error);
            }
        });
        // CONTROL
        this.addControlUser = (username, role, socket) => __awaiter(this, void 0, void 0, function* () {
            try {
                const managerDetails = yield this.getManagerDetails(username);
                // Prevent duplicate sessions
                if (this.control.has(username)) {
                    socket.emit("error", "Control session already exists.");
                    socket.disconnect();
                    return;
                }
                // Create Manager Instance
                const manager = new Manager_1.default(username, managerDetails.credits, role, socket.handshake.headers["user-agent"], socket);
                this.control.set(username, manager);
                // Update Redis
                yield redis_1.redisClient.pubClient.hSet(events_1.Channels.CONTROL(role, username), {
                    username,
                    role: "manager",
                    credits: manager.credits.toString()
                });
                console.log(`✅ Control session stored for ${username}`);
            }
            catch (error) {
                console.error(`❌ Failed to add control user:`, error);
            }
        });
        this.removeControlUser = (username, role) => __awaiter(this, void 0, void 0, function* () {
            try {
                const manager = this.control.get(username);
                if (manager) {
                    // ❌ Stop heartbeat before removing session
                    this.stopControlHeartbeat(manager);
                }
                this.control.delete(username);
                yield redis_1.redisClient.pubClient.del(events_1.Channels.CONTROL(role, username));
                console.log(`✅ Control session deleted for ${username}`);
            }
            catch (error) {
                console.error(`❌ Failed to delete control session for ${username}`, error);
            }
        });
        this.startControlHeartbeat = (manager) => {
            if (!manager || !manager.socketData.socket)
                return;
            // ✅ Stop any existing heartbeat before starting a new one
            this.stopControlHeartbeat(manager);
            // ✅ Start a new heartbeat interval
            manager.socketData.heartbeatInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                if (!manager.socketData.socket || !manager.socketData.socket.connected) {
                    this.stopControlHeartbeat(manager);
                    return;
                }
                // Send control session updates
                manager.sendData({
                    type: events_1.Events.CONTROL_CREDITS,
                    payload: { credits: manager.credits, role: manager.role, worker: process.pid }
                });
                // Send all active players data
                const allPlayers = yield manager.handleGetAllPlayers();
                manager.sendData({ type: events_1.Events.PLAYGROUND_ALL, payload: allPlayers });
            }), 5000); // Update every 5 seconds
        };
        this.stopControlHeartbeat = (manager) => {
            if (manager.socketData.heartbeatInterval) {
                clearInterval(manager.socketData.heartbeatInterval);
                manager.socketData.heartbeatInterval = null;
            }
        };
        // HELPER
        this.notify = (username, event, payload) => __awaiter(this, void 0, void 0, function* () {
            try {
                const hierarchyUsers = yield userModel_1.Player.getHierarchyUsers(username);
                for (const manager of hierarchyUsers) {
                    const channel = `control:${manager.role}:${manager.username}`;
                    yield redis_1.redisClient.pubClient.publish(channel, JSON.stringify({ type: event, payload }));
                    console.log(`📢 Published event to ${channel}:`, { type: event, payload });
                }
            }
            catch (error) {
                console.error("❌ Failed to publish notifications to Redis:", error);
            }
        });
        this.getControlUser = (username) => {
            return this.control.get(username) || null;
        };
        this.getPlaygroundUser = (username) => {
            return this.playground.get(username) || null;
        };
        // Start periodic cleanup of stale sessions
        setInterval(this.cleanupStaleSessions, SESSION_EXPIRATION_TIME * 1000);
    }
    getGameNameByTagName(tagName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const platform = yield gameModel_1.Platform.aggregate([
                    { $unwind: "$games" },
                    { $match: { "games.tagName": tagName } },
                    { $project: { _id: 0, gameName: "$games.name" } },
                    { $limit: 1 }
                ]);
                if (platform.length === 0) {
                    return "Unknown Game"; // Default if not found
                }
                return platform[0].gameName;
            }
            catch (error) {
                console.error(`❌ Error fetching game name for tag: ${tagName}`, error);
                return "Unknown Game";
            }
        });
    }
    restoreSessionFromRedis(sessionData, socket) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`🔄 Restoring session from Redis for ${sessionData.playerId}`);
                // ✅ Properly reconstruct the PlayerSocket object
                const player = new Player_1.default(sessionData.playerId, sessionData.role, sessionData.status, parseFloat(sessionData.currentCredits), sessionData.userAgent, socket, sessionData.managerName);
                player.entryTime = new Date(sessionData.entryTime);
                player.exitTime = sessionData.exitTime !== "null" ? new Date(sessionData.exitTime) : null;
                player.currentRTP = parseFloat(sessionData.currentRTP);
                player.platformData.platformId = sessionData.platformId;
                // ✅ Store restored player in memory
                this.playground.set(sessionData.playerId, player);
                // ✅ Ensure socket events are re-initialized
                player.initializePlatformSocket(socket);
                // ✅ Re-subscribe to Redis events
                player.subscribeToRedisEvents();
                // ✅ Restart heartbeat
                this.startSessionHeartbeat(player);
                console.log(`✅ Successfully restored session for ${sessionData.playerId}`);
                return player;
            }
            catch (error) {
                console.error(`❌ Failed to restore session for ${sessionData.playerId}:`, error);
                return null;
            }
        });
    }
    cleanupStaleSessions() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const keys = yield redis_1.redisClient.pubClient.keys(`${events_1.Channels.PLAYGROUND('*')}`);
                for (const key of keys) {
                    const ttl = yield redis_1.redisClient.pubClient.ttl(key);
                    if (ttl === -2) { // Key does not exist
                        const username = key.split(':')[1];
                        // 🔍 Ensure the player is truly inactive before removing
                        if (this.playground.has(username)) {
                            console.warn(`⚠️ Prevented premature cleanup for active player: ${username}`);
                            continue;
                        }
                        this.playground.delete(username);
                        console.log(`🧹 Cleaned up stale session for ${username}`);
                    }
                }
            }
            catch (error) {
                console.error("Error cleaning up stale sessions:", error);
            }
        });
    }
    restoreControlUserFromRedis(sessionData, socket) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`🔄 Restoring manager session from Redis for ${sessionData.username}`);
                // ✅ Properly reconstruct the Manager object
                const manager = new Manager_1.default(sessionData.username, parseFloat(sessionData.credits), sessionData.role, sessionData.userAgent, socket);
                // ✅ Store the restored manager in memory
                this.control.set(sessionData.username, manager);
                // ✅ Re-subscribe to Redis events
                manager.subscribeToRedisEvents();
                // ✅ Restart heartbeat
                this.startControlHeartbeat(manager);
                console.log(`✅ Successfully restored manager session for ${sessionData.username}`);
                return manager;
            }
            catch (error) {
                console.error(`❌ Failed to restore control session for ${sessionData.username}:`, error);
                return null;
            }
        });
    }
}
exports.sessionManager = new SessionManager();
