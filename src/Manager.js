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
Object.defineProperty(exports, "__esModule", { value: true });
const sessionManager_1 = require("./dashboard/session/sessionManager");
const sessionModel_1 = require("./dashboard/session/sessionModel");
const redis_1 = require("./config/redis");
const events_1 = require("./utils/events");
class Manager {
    constructor(username, credits, role, userAgent, socket) {
        this.username = username;
        this.credits = credits;
        this.role = role;
        this.userAgent = userAgent;
        this.initializeManagerSocket(socket);
        this.subscribeToRedisEvents();
    }
    initializeManagerSocket(socket) {
        return __awaiter(this, void 0, void 0, function* () {
            this.resetSocketData();
            this.socketData = {
                socket: socket,
                heartbeatInterval: setInterval(() => { }, 0),
                reconnectionAttempts: 0,
                maxReconnectionAttempts: 3,
                reconnectionTimeout: null,
                cleanedUp: false
            };
            this.initializeSocketHandler();
            // ✅ Restart heartbeat when the manager reconnects
            sessionManager_1.sessionManager.startControlHeartbeat(this);
            // Handle disconnection logic
            this.socketData.socket.on("disconnect", () => {
                console.log(`Manager ${this.username} disconnected`);
                this.handleDisconnection();
            });
        });
    }
    subscribeToRedisEvents() {
        const channel = events_1.Channels.CONTROL(this.role, this.username);
        redis_1.redisClient.subClient.subscribe(channel, (message) => {
            const data = JSON.parse(message);
            console.log(`🔄 Syncing state for ${this.username}:`, data);
            switch (data.type) {
                case events_1.Events.CONTROL_CREDITS:
                    this.credits = data.payload.credits;
                    this.sendData({ type: events_1.Events.CONTROL_CREDITS, payload: this.credits });
                    break;
                case events_1.Events.PLAYGROUND_ENTER:
                    this.sendData({ type: events_1.Events.PLAYGROUND_ENTER, payload: data.payload });
                    break;
                case events_1.Events.PLAYGROUND_EXIT:
                    this.sendData({ type: events_1.Events.PLAYGROUND_EXIT, payload: data.payload });
                    break;
                case events_1.Events.PLAYGROUND_GAME_ENTER:
                    this.sendData({ type: events_1.Events.PLAYGROUND_GAME_ENTER, payload: data.payload });
                    break;
                case events_1.Events.PLAYGROUND_GAME_EXIT:
                    this.sendData({ type: events_1.Events.PLAYGROUND_GAME_EXIT, payload: data.payload });
                    break;
                case events_1.Events.PLAYGROUND_GAME_SPIN:
                    this.sendData({ type: events_1.Events.PLAYGROUND_GAME_SPIN, payload: data.payload });
                    break;
                case events_1.Events.PLAYGROUND_ALL:
                    this.handleGetAllPlayers();
                    break;
                default:
                    console.log(`Unknown message type: ${data.type}`);
            }
        });
    }
    resetSocketData() {
        if (this.socketData) {
            if (this.socketData.socket) {
                this.socketData.socket.removeAllListeners();
                this.socketData.socket.disconnect();
            }
            clearInterval(this.socketData.heartbeatInterval);
            if (this.socketData.reconnectionTimeout) {
                clearTimeout(this.socketData.reconnectionTimeout);
                this.socketData.reconnectionTimeout = null;
            }
            this.socketData.socket = null;
        }
    }
    handleDisconnection() {
        return __awaiter(this, void 0, void 0, function* () {
            // ❌ Stop the heartbeat when manager disconnects
            sessionManager_1.sessionManager.stopControlHeartbeat(this);
            clearInterval(this.socketData.heartbeatInterval);
            this.socketData.socket = null;
            this.socketData.reconnectionTimeout = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                console.log(`Removing manager ${this.username} due to prolonged disconnection`);
                yield sessionManager_1.sessionManager.removeControlUser(this.username, this.role);
            }), 60000);
        });
    }
    // TODO: Check we are using this
    initializeSocketHandler() {
        if (this.socketData.socket) {
            this.socketData.socket.on("data", (message, callback) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const res = message;
                    switch (res.action) {
                        case events_1.Events.PLAYGROUND_EXIT:
                            yield this.forceRemovePlayer(res.payload.playerId, callback);
                            break;
                        case "PLAYER_SESSION":
                            yield this.playerSessionHandler(res.payload, callback);
                            break;
                    }
                }
                catch (error) {
                    console.log("Error handling socket data:", error);
                    if (callback)
                        callback({ success: false, message: "Internal error" });
                }
            }));
        }
    }
    notifyManager(data) {
        if (this.socketData.socket) {
            this.socketData.socket.emit("PLATFORM", data);
        }
        else {
            console.error(`Socket is not available for manager ${this.username}`);
        }
    }
    forceRemovePlayer(playerId, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`🚨 Manager requested forceful removal of player: ${playerId}`);
                const playerSession = sessionManager_1.sessionManager.getPlaygroundUser(playerId);
                if (!playerSession) {
                    console.warn(`⚠️ Player ${playerId} is not in an active session.`);
                    if (callback)
                        callback({ success: false, message: "Player not found or already removed" });
                    return;
                }
                // 🚀 Notify the player on the frontend
                playerSession.sendData({ type: events_1.Events.PLAYGROUND_EXIT, message: "You have been removed by the manager." }, "platform");
                // ⏳ Wait a moment to allow the client to process the message
                setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                    // ✅ Forcefully remove player session
                    yield sessionManager_1.sessionManager.endSession(playerId);
                    console.log(`✅ Player ${playerId} forcefully removed by manager.`);
                    if (callback)
                        callback({ success: true, message: "Player successfully removed" });
                }), 500); // Delay to ensure message is received before disconnecting
            }
            catch (error) {
                console.error(`❌ Error forcefully removing player ${playerId}:`, error);
                if (callback)
                    callback({ success: false, message: "Error removing player" });
            }
        });
    }
    playerSessionHandler(data, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Retrieve all platform session data for the player
                const platformSessions = yield sessionModel_1.PlatformSessionModel.find({ playerId: data.playerId }).lean();
                if (!platformSessions || platformSessions.length === 0) {
                    console.log("No session data found for player:", data.playerId);
                    if (callback)
                        callback({ success: false, message: "No session data found for this player" });
                    return;
                }
                // Return all session data to the client
                if (callback)
                    callback({ success: true, message: "All session data retrieved successfully", sessionData: platformSessions });
            }
            catch (error) {
                console.error("Error retrieving player session data:", error);
                if (callback)
                    callback({ success: false, message: "Error retrieving session data" });
            }
        });
    }
    handleGetAllPlayers() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const allPlayers = [];
                const playgroundKeys = yield redis_1.redisClient.pubClient.keys(events_1.Channels.PLAYGROUND("*"));
                for (const playerKey of playgroundKeys) {
                    const playerData = yield redis_1.redisClient.pubClient.hGetAll(playerKey);
                    if (Object.keys(playerData).length === 0)
                        continue;
                    let currentGame = null;
                    if (playerData.currentGame && playerData.currentGame !== "null") {
                        try {
                            currentGame = JSON.parse(playerData.currentGame);
                            // ✅ Ensure gameName is always defined
                            if (!currentGame.gameName) {
                                currentGame.gameName = "Unknown Game";
                            }
                        }
                        catch (error) {
                            console.error(`❌ Failed to parse currentGame for ${playerData.playerId}:`, error);
                        }
                    }
                    allPlayers.push({
                        playerId: playerData.playerId,
                        status: playerData.status,
                        initialCredits: playerData.initialCredits ? parseFloat(playerData.initialCredits) : 0,
                        currentCredits: playerData.currentCredits ? parseFloat(playerData.currentCredits) : 0,
                        managerName: playerData.managerName || null,
                        entryTime: playerData.entryTime ? new Date(playerData.entryTime) : null,
                        exitTime: playerData.exitTime && playerData.exitTime !== "null" ? new Date(playerData.exitTime) : null,
                        currentRTP: playerData.currentRTP ? parseFloat(playerData.currentRTP) : 0,
                        userAgent: playerData.userAgent || "Unknown",
                        currentGame: currentGame,
                        platformId: playerData.platformId || null,
                    });
                }
                return allPlayers;
            }
            catch (error) {
                console.error("❌ Error fetching all playground players from Redis:", error);
                return [];
            }
        });
    }
    sendMessage(data) {
        if (this.socketData.socket) {
            this.socketData.socket.emit("message", data);
        }
    }
    sendData(data) {
        if (this.socketData.socket) {
            this.socketData.socket.emit("data", data);
        }
    }
    sendAlert(data) {
        if (this.socketData.socket) {
            this.socketData.socket.emit("alert", data);
        }
    }
}
exports.default = Manager;
