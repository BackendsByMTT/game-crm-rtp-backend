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
const userModel_1 = require("./dashboard/users/userModel");
const sessionManager_1 = require("./dashboard/session/sessionManager");
const sessionModel_1 = require("./dashboard/session/sessionModel");
const redis_1 = require("./config/redis");
const eventTypes_1 = require("./utils/eventTypes");
class Manager {
    constructor(username, credits, role, userAgent, socket) {
        this.username = username;
        this.credits = credits;
        this.role = role;
        this.userAgent = userAgent;
        this.initializeManager(socket);
        this.subscribeToRedisEvents();
    }
    subscribeToRedisEvents() {
        redis_1.redisClient.subClient.subscribe(`control:${this.role}:${this.username}`, (message) => {
            const data = JSON.parse(message);
            console.log(`🔄 Syncing state for ${this.username}:`, data);
            switch (data.type) {
                case "UPDATE_BALANCE":
                    this.credits = data.payload.credits;
                    this.sendData({ type: "CREDIT", data: { credits: this.credits } });
                    break;
                case eventTypes_1.NewEventType.PLAYGROUND_JOINED:
                    this.socketData.socket.emit("PLATFORM", { type: "ENTERED_PLATFORM", payload: data.payload });
                    break;
                case eventTypes_1.NewEventType.PLAYGROUND_EXITED:
                    this.socketData.socket.emit("PLATFORM", { type: "EXITED_PLATFORM", payload: data.payload });
                    break;
                case eventTypes_1.NewEventType.GAME_STARTED:
                    this.socketData.socket.emit("PLATFORM", { type: "ENTERED_GAME", payload: data.payload });
                    break;
                case eventTypes_1.NewEventType.GAME_ENDED:
                    this.socketData.socket.emit("PLATFORM", { type: "EXITED_GAME", payload: data.payload });
                    break;
                case eventTypes_1.NewEventType.UPDATE_SPIN:
                    this.socketData.socket.emit("PLATFORM", { type: "UPDATE_SPIN", payload: data.payload });
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
    initializeManager(socket) {
        return __awaiter(this, void 0, void 0, function* () {
            this.resetSocketData();
            this.socketData = {
                socket: socket,
                heartbeatInterval: setInterval(() => __awaiter(this, void 0, void 0, function* () {
                    if (this.socketData.socket) {
                        // Fetch all players from Redis and send to the manager
                        const allActivePlayers = yield this.getAllPlaygroundPlayers();
                        this.socketData.socket.emit(eventTypes_1.NewEventType.ALL_PLAYGROUND_PLAYERS, allActivePlayers);
                        this.sendData({
                            type: "CREDITS",
                            payload: { credits: this.credits, role: this.role, worker: process.pid }
                        });
                    }
                }), 5000), // Updates every 5 seconds
                reconnectionAttempts: 0,
                maxReconnectionAttempts: 3,
                reconnectionTimeout: null,
                cleanedUp: false
            };
            this.initializeSocketHandler();
            this.socketData.socket.on("disconnect", () => {
                console.log(`Manager ${this.username} disconnected`);
                this.handleDisconnection();
            });
            yield sessionManager_1.sessionManager.addControlUser(this);
            this.sendData({ type: "CREDITS", payload: { credits: this.credits, role: this.role } });
        });
    }
    handleDisconnection() {
        return __awaiter(this, void 0, void 0, function* () {
            clearInterval(this.socketData.heartbeatInterval); // Clear heartbeat on disconnect
            this.socketData.socket = null;
            this.socketData.reconnectionTimeout = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                console.log(`Removing manager ${this.username} due to prolonged disconnection`);
                yield sessionManager_1.sessionManager.removeControlUser(this.username);
            }), 60000); // 1-minute timeout for reconnection
        });
    }
    initializeSocketHandler() {
        if (this.socketData.socket) {
            this.socketData.socket.on("data", (message, callback) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const res = message;
                    switch (res.action) {
                        case "PLAYER_STATUS":
                            yield this.playerStatusHandler(res.payload, callback);
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
    playerStatusHandler(data, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Attempt to retrieve the player document
                const player = yield userModel_1.Player.findOne({ username: data.playerId });
                if (!player) {
                    console.log("Player not found:", data.playerId);
                    if (callback)
                        callback({ success: false, message: "Player not found" });
                    return;
                }
                // Attempt to update the status field
                const updateResult = yield userModel_1.Player.updateOne({ username: data.playerId }, { $set: { status: data.status } });
                // Check if the update was successful using modifiedCount
                if (updateResult.modifiedCount === 0) {
                    console.warn(`No document modified for player: ${data.playerId}`);
                    if (callback)
                        callback({ success: false, message: "No changes made to status" });
                    return;
                }
                // Notify the player socket of the status change
                const playerSocket = yield sessionManager_1.sessionManager.getPlaygroundSession(data.playerId);
                if (playerSocket) {
                    if (data.status === "inactive") {
                        yield playerSocket.forceExit(false);
                        console.log(`Player ${data.playerId} exited from platform due to inactivity`);
                    }
                    else {
                        playerSocket.sendData({ type: "STATUS", data: { status: data.status } }, "platform");
                    }
                }
                if (callback)
                    callback({ success: true, message: "Status updated successfully" });
            }
            catch (error) {
                console.error("Error updating player status:", error);
                if (callback)
                    callback({ success: false, message: "Error updating status" });
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
    getAllPlaygroundPlayers() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const allPlayers = [];
                const playgroundKeys = yield redis_1.redisClient.pubClient.keys("playground:*");
                for (const playerKey of playgroundKeys) {
                    const playerData = yield redis_1.redisClient.pubClient.hGetAll(playerKey);
                    // Ensure playerData exists
                    if (Object.keys(playerData).length === 0)
                        continue;
                    allPlayers.push({
                        username: playerData.playerId,
                        status: playerData.status,
                        currentCredits: playerData.currentCredits ? parseFloat(playerData.currentCredits) : 0,
                        platformId: playerData.platformId || null,
                        managerName: playerData.managerName || null,
                        entryTime: playerData.entryTime ? new Date(playerData.entryTime) : null,
                        exitTime: playerData.exitTime && playerData.exitTime !== "null" ? new Date(playerData.exitTime) : null,
                        currentRTP: playerData.currentRTP ? parseFloat(playerData.currentRTP) : 0,
                        currentGame: playerData.currentGame && playerData.currentGame !== "null"
                            ? JSON.parse(playerData.currentGame)
                            : null,
                        userAgent: playerData.userAgent || "Unknown",
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
