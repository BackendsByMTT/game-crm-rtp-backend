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
exports.sessionManager = void 0;
const redis_1 = require("../../config/redis");
const userModel_1 = require("../users/userModel");
const gameSession_1 = require("./gameSession");
const sessionModel_1 = require("./sessionModel");
const eventTypes_1 = require("../../utils/eventTypes");
class SessionManager {
    constructor() {
        this.playground = new Map();
        this.control = new Map();
    }
    startSession(player) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                const sessionData = player.getSummary();
                this.playground.set(player.playerData.username, player);
                yield redis_1.redisClient.pubClient.hSet(`playground:${player.playerData.username}`, {
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
                const playgroundSessionData = new sessionModel_1.PlatformSessionModel(sessionData);
                yield playgroundSessionData.save();
                yield this.notify(player.playerData.username, eventTypes_1.NewEventType.PLAYGROUND_JOINED, sessionData);
                this.sessionHeartbeat(player);
                console.log(`✅ Playground session stored in Redis & memory for ${player.playerData.username}`);
            }
            catch (error) {
                console.error(`Failed to save playground session for player: ${player.playerData.username}`, error);
            }
        });
    }
    // TODO: Need to fix why it disconnects automatically when joined
    endSession(player) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.playground.delete(player.playerData.username);
                yield redis_1.redisClient.pubClient.del(`playground:${player.playerData.username}`);
                yield this.notify(player.playerData.username, eventTypes_1.NewEventType.PLAYGROUND_EXITED, player.getSummary());
                yield sessionModel_1.PlatformSessionModel.updateOne({ playerId: player.playerData.username, entryTime: player.entryTime }, { $set: { exitTime: new Date() } });
            }
            catch (error) {
                console.error(`Failed to delete playground session for player: ${player.playerData.username}`, error);
            }
        });
    }
    startGame(player) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                player.currentGameSession = new gameSession_1.GameSession(player.playerData.username, player.currentGameData.gameId, player.playerData.credits);
                player.currentGameSession.on(eventTypes_1.NewEventType.UPDATE_SPIN, (summary) => __awaiter(this, void 0, void 0, function* () {
                    yield this.notify(player.playerData.username, eventTypes_1.NewEventType.UPDATE_SPIN, summary);
                }));
                const gameSummary = (_a = player.currentGameSession) === null || _a === void 0 ? void 0 : _a.getSummary();
                yield redis_1.redisClient.pubClient.hSet(`playground:${player.playerData.username}`, { "currentGame": JSON.stringify(gameSummary) });
                yield this.notify(player.playerData.username, eventTypes_1.NewEventType.GAME_STARTED, gameSummary);
            }
            catch (error) {
                console.error(`Failed to start game session for player: ${player.playerData.username}`, error);
            }
        });
    }
    endGame(player) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`🎮 ENDING GAME SESSION FOR ${player.playerData.username}`);
                if (!player.currentGameSession) {
                    console.warn(`⚠️ No active game session found for ${player.playerData.username}`);
                    return;
                }
                const gameSummary = player.currentGameSession.getSummary();
                console.log(`GAME SUMMARY FOR ${player.playerData.username}:`, gameSummary);
                player.currentGameSession.exitTime = new Date();
                player.currentGameSession.creditsAtExit = player.playerData.credits;
                player.currentGameSession.sessionDuration = Math.abs(player.currentGameSession.exitTime.getTime() - player.currentGameSession.entryTime.getTime());
                player.currentGameSession = null;
                player.currentGameData.session = null;
                if (player.currentGameData.socket) {
                    console.log(`Disconnecting game socket for ${player.playerData.username}`);
                    player.currentGameData.socket.disconnect();
                    player.currentGameData.socket = null;
                }
                if (player.currentGameData.heartbeatInterval) {
                    clearInterval(player.currentGameData.heartbeatInterval);
                    console.log(`💓 Cleared game heartbeat for ${player.playerData.username}`);
                }
                yield redis_1.redisClient.pubClient.hDel(`playground:${player.playerData.username}`, "currentGame");
                yield sessionModel_1.PlatformSessionModel.updateOne({ playerId: player.playerData.username, entryTime: player.entryTime }, { $push: { gameSessions: gameSummary }, $set: { currentRTP: player.currentRTP } });
                yield this.notify(player.playerData.username, eventTypes_1.NewEventType.GAME_ENDED, gameSummary);
                console.log(`✅ Successfully ended game session for ${player.playerData.username}`);
            }
            catch (error) {
                console.error(`❌ Failed to end game session for player: ${player.playerData.username}`, error);
            }
        });
    }
    getPlaygroundSession(username) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.playground.has(username)) {
                return this.playground.get(username) || null;
            }
            return null;
        });
    }
    notify(username, eventType, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const hierarchyUsers = yield userModel_1.Player.getHierarchyUsers(username);
                for (const manager of hierarchyUsers) {
                    const channel = `control:${manager.role}:${manager.username}`;
                    yield redis_1.redisClient.pubClient.publish(channel, JSON.stringify({ type: eventType, payload }));
                    console.log(`📢 Published event to ${channel}:`, { type: eventType, payload });
                }
            }
            catch (error) {
                console.error("❌ Failed to publish notifications to Redis:", error);
            }
        });
    }
    sessionHeartbeat(player) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!player || !player.platformData.socket)
                return;
            player.sendData({ type: "CREDIT", data: { credits: player.playerData.credits } }, "platform");
            player.platformData.heartbeatInterval = setInterval(() => {
                if (!player.platformData.socket || !player.platformData.socket.connected) {
                    clearInterval(player.platformData.heartbeatInterval);
                    console.log(`💔 Stopped heartbeat for ${player.playerData.username}`);
                    return;
                }
                player.sendData({ type: "CREDIT", data: { credits: player.playerData.credits, worker: process.pid } }, "platform");
            }, 5000); // Update every 5 seconds
        });
    }
    addControlUser(user) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.control.set(user.username, user);
                yield redis_1.redisClient.pubClient.hSet(`control:${user.role}:${user.username}`, {
                    "username": user.username,
                    "role": user.role,
                    "credits": user.credits.toString(),
                    "userAgent": user.userAgent || "",
                });
                console.log(`✅ Control session stored in Redis & memory for ${user.username}`);
            }
            catch (error) {
                console.error(`❌ Failed to save control session for user: ${user.username}`, error);
            }
        });
    }
    removeControlUser(username) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.control.delete(username);
                yield redis_1.redisClient.pubClient.del(`control:${username}`);
                console.log(`✅ Control session deleted from Redis & memory for ${username}`);
            }
            catch (error) {
                console.error(`❌ Failed to delete control session for user: ${username}`, error);
            }
        });
    }
    getPlayerCurrentGameSession(username) {
        return __awaiter(this, void 0, void 0, function* () {
            const playerSession = yield this.getPlaygroundSession(username);
            return (playerSession === null || playerSession === void 0 ? void 0 : playerSession.currentGameSession) || null;
        });
    }
}
exports.sessionManager = new SessionManager();
