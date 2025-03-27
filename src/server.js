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
exports.setupWebSocket = setupWebSocket;
const socket_io_1 = require("socket.io");
const socketAuth_1 = require("./dashboard/middleware/socketAuth");
const sessionManager_1 = require("./dashboard/session/sessionManager");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const redis_1 = require("./config/redis");
const events_1 = require("./utils/events");
function setupWebSocket(server, corsOptions) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const io = new socket_io_1.Server(server, { cors: corsOptions });
            io.use(socketAuth_1.socketAuth);
            yield redis_1.redisClient.connect();
            io.adapter((0, redis_adapter_1.createAdapter)(redis_1.redisClient.pubClient, redis_1.redisClient.subClient));
            const namespaces = {
                playground: io.of("/playground"),
                control: io.of("/control"),
                game: io.of("/game")
            };
            Object.values(namespaces).forEach((ns) => ns.use(socketAuth_1.socketAuth));
            // ✅ Playground Namespace (For Players)
            namespaces.playground.on("connection", (socket) => __awaiter(this, void 0, void 0, function* () {
                const { username, role } = socket.data.user;
                const userAgent = socket.handshake.headers["user-agent"];
                const playgroundId = socket.handshake.auth.playgroundId;
                if (role !== "player") {
                    socket.disconnect();
                    return;
                }
                if (!playgroundId) {
                    this.disconnectWithError(socket, "No playgroundId provided.");
                    return;
                }
                let existingSession = sessionManager_1.sessionManager.getPlaygroundUser(username);
                if (existingSession) {
                    if (existingSession.platformData.socket.connected) {
                        if (existingSession.platformData.platformId === playgroundId) {
                            this.disconnectWithError(socket, "Already connected in Playground.");
                            return;
                        }
                        // this.disconnectWithError(socket, "Cannot connect to multiple Playgrounds simultaneously.");
                        socket.emit('alert', "NewTab");
                        return;
                    }
                    // 🔄 Restore session from memory
                    console.log(`🔄 Restoring session from memory for ${username}`);
                    existingSession.initializePlatformSocket(socket);
                    return;
                }
                const redisSession = yield redis_1.redisClient.pubClient.hGetAll(events_1.Channels.PLAYGROUND(username));
                if (redisSession && Object.keys(redisSession).length > 0) {
                    console.log(`🔄 Restoring session from Redis for ${username}`);
                    const restoredSession = yield sessionManager_1.sessionManager.restoreSessionFromRedis(redisSession, socket);
                    if (restoredSession)
                        return;
                }
                yield sessionManager_1.sessionManager.startSession(username, role, userAgent, socket);
            }));
            // 🎮 Game Namespace (For Players)
            namespaces.game.on("connection", (socket) => __awaiter(this, void 0, void 0, function* () {
                const { username } = socket.data.user;
                const gameId = socket.handshake.auth.gameId;
                // 🚀 Start game session
                console.log(`🎰 Player ${username} entering game: ${gameId}`);
                yield sessionManager_1.sessionManager.startGame(username, gameId, socket);
            }));
            // 🛠️ Control Namespace (For Managers)
            namespaces.control.on("connection", (socket) => __awaiter(this, void 0, void 0, function* () {
                const { username, role } = socket.data.user;
                const userAgent = socket.handshake.headers["user-agent"];
                let existingManager = sessionManager_1.sessionManager.getControlUser(username);
                if (existingManager) {
                    console.log(`🔄 Restoring control session from memory for ${username}`);
                    existingManager.initializeManagerSocket(socket);
                    return;
                }
                const redisSession = yield redis_1.redisClient.pubClient.hGetAll(events_1.Channels.CONTROL(role, username));
                if (redisSession && Object.keys(redisSession).length > 0) {
                    console.log(`🔄 Restoring control session from Redis for ${username}`);
                    const restoredManager = yield sessionManager_1.sessionManager.restoreControlUserFromRedis(redisSession, socket);
                    if (restoredManager)
                        return;
                }
                yield sessionManager_1.sessionManager.addControlUser(username, role, socket);
            }));
        }
        catch (error) {
            console.error("❌ Error setting up WebSocket:", error);
            process.exit(1);
        }
    });
}
function disconnectWithError(socket, message) {
    console.log(`🚨 ${message}`);
    socket.emit("error", { message });
    socket.disconnect();
}
