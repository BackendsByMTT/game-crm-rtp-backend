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
exports.setupWebSocket = setupWebSocket;
const cluster_1 = __importDefault(require("cluster"));
const socket_io_1 = require("socket.io");
const socketAuth_1 = require("./dashboard/middleware/socketAuth");
const sessionManager_1 = require("./dashboard/session/sessionManager");
const Player_1 = __importDefault(require("./Player"));
const userModel_1 = require("./dashboard/users/userModel");
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
function setupWebSocket(server, corsOptions) {
    var _a;
    const io = new socket_io_1.Server(server, { cors: corsOptions });
    io.use(socketAuth_1.socketAuth);
    const namespaces = {
        playground: io.of("/playground"),
        control: io.of("/control"),
        // game: io.of("/game")
    };
    Object.values(namespaces).forEach((ns) => ns.use(socketAuth_1.socketAuth));
    io.on("connection", (socket) => __awaiter(this, void 0, void 0, function* () {
        var _a;
        const { username, role, userAgent } = socket.data.user;
        const gameId = socket.handshake.auth.gameId;
        if (role !== "player")
            return socket.disconnect();
        console.log(`🎰 Player ${username} is attempting to enter the Arena`);
        let existingSession = sessionManager_1.sessionManager.getPlayerPlatform(username);
        // Check if player has an active playground session
        if (!existingSession || !((_a = existingSession.platformData) === null || _a === void 0 ? void 0 : _a.socket.connected)) {
            return disconnectWithError(socket, "You must be connected to a Playground first.");
        }
        // Always treat `updateGameSocket` as the first game session entry
        console.log(`🎰 Player ${username} entering game, updating socket session`);
        yield existingSession.updateGameSocket(socket);
        existingSession.sendAlert(`🎰 Welcome to the Arena : ${existingSession.currentGameData.gameId}`);
    }));
    // **Playground Namespace (For Players)**
    namespaces.playground.on("connection", (socket) => __awaiter(this, void 0, void 0, function* () {
        var _a;
        const { username, role } = socket.data.user;
        if (role !== "player")
            return socket.disconnect();
        const playgroundId = socket.handshake.auth.playgroundId;
        const userAgent = socket.handshake.headers["user-agent"];
        console.log("PLAYGROUND : ", userAgent);
        if (!playgroundId)
            return disconnectWithError(socket, "No playgroundId provided");
        let existingSession = sessionManager_1.sessionManager.getPlayerPlatform(username);
        if ((_a = existingSession === null || existingSession === void 0 ? void 0 : existingSession.platformData) === null || _a === void 0 ? void 0 : _a.socket.connected) {
            if (existingSession.platformData.platformId === playgroundId) {
                return disconnectWithError(socket, "Already connected in playground");
            }
            return disconnectWithError(socket, "Cannot connect to multiple playgrounds simultaneously");
        }
        try {
            const playerDetails = yield getPlayerDetails(username);
            let player;
            if (existingSession) {
                existingSession.initializePlatformSocket(socket);
                player = existingSession; // TypeScript now knows it's a PlayerSocket
            }
            else {
                player = new Player_1.default(username, role, playerDetails.status, playerDetails.credits, userAgent, socket, playerDetails.managerName);
            }
            player.platformData.platformId = playgroundId;
            player.sendAlert(`🎮 Welcome to Playground ${playgroundId}`, false);
        }
        catch (error) {
            disconnectWithError(socket, "Failed to retrieve player details.");
        }
    }));
    namespaces.control.on("connection", (socket) => {
        const { username, role } = socket.data.user;
        if (!["admin", "moderator"].includes(role))
            return socket.disconnect();
        console.log(`🛠️ ${role} ${username} entered the Control Room`);
        socket.on("monitor-player", (data) => console.log(`👀 ${username} is monitoring`, data));
        socket.on("kick-player", (playerId) => namespaces.playground.to(playerId).emit("kicked", { message: "You have been removed by an admin" }));
        socket.on("disconnect", () => console.log(`🛠️ ${role} ${username} left the Control Room`));
    });
    console.log(`⚡ WebSocket server running on worker ${(_a = cluster_1.default.worker) === null || _a === void 0 ? void 0 : _a.id}`);
}
function disconnectWithError(socket, message) {
    console.log(`🚨 ${message}`);
    socket.emit("error", { message });
    socket.disconnect();
}
