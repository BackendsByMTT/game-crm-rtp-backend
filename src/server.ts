import { Server } from "socket.io";
import { socketAuth } from "./dashboard/middleware/socketAuth";
import { sessionManager } from "./dashboard/session/sessionManager";
import { User } from "./dashboard/users/userModel";
import { messageType } from "./game/Utils/gameUtils";
import Manager from "./Manager";
import { createAdapter } from "@socket.io/redis-adapter";
import { redisClient } from "./config/redis";
import { Channels } from "./utils/events";


export async function setupWebSocket(server: any, corsOptions: any) {
    const io = new Server(server, { cors: corsOptions });
    io.use(socketAuth);

    try {
        await redisClient.connect();
    } catch (error) {
        console.error("❌ Redis connection error:", error);
        process.exit(1);
    }

    io.adapter(createAdapter(redisClient.pubClient, redisClient.subClient));

    const namespaces = {
        playground: io.of("/playground"),
        control: io.of("/control"),
        game: io.of("/game")
    };

    Object.values(namespaces).forEach((ns) => ns.use(socketAuth));

    // ✅ Playground Namespace (For Players)
    namespaces.playground.on("connection", async (socket) => {
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

        let existingSession = sessionManager.getPlaygroundUser(username)
        if (existingSession) {
            if (existingSession.platformData.socket.connected) {
                if (existingSession.platformData.platformId === playgroundId) {
                    this.disconnectWithError(socket, "Already connected in Playground.");
                    return;
                }
                this.disconnectWithError(socket, "Cannot connect to multiple Playgrounds simultaneously.");
                return;
            }

            // 🔄 Restore session from memory
            console.log(`🔄 Restoring session from memory for ${username}`);
            existingSession.initializePlatformSocket(socket);
            return;
        }

        const redisSession = await redisClient.pubClient.hGetAll(Channels.PLAYGROUND(username));
        if (redisSession && Object.keys(redisSession).length > 0) {
            console.log(`🔄 Restoring session from Redis for ${username}`);
            const restoredSession = await sessionManager.restoreSessionFromRedis(redisSession, socket);
            if (restoredSession) return;
        }

        await sessionManager.startSession(username, role, userAgent, socket)

    });

    // Game Namespace (For Players)
    namespaces.game.on("connection", async (socket) => {
        const { username } = socket.data.user;
        const gameId = socket.handshake.auth.gameId;

        // 🔍 Ensure player is connected to the Playground first
        let existingSession = await sessionManager.getPlaygroundUser(username);
        if (!existingSession || !existingSession.platformData?.socket.connected) {
            return disconnectWithError(socket, "You must be connected to the Playground first.");
        }

        // 🔍 Check if player is already in a game
        if (existingSession.currentGameSession) {
            console.log(`⚠️ Player ${username} is already in a game: ${existingSession.currentGameData.gameId}`);
            return disconnectWithError(socket, "You are already playing a game. Finish your current session first.");
        }

        // 🚀 Start game session
        console.log(`🎰 Player ${username} entering game: ${gameId}`);
        await sessionManager.startGame(username, gameId, socket);
    });

    // Control Namespace (For Managers)
    namespaces.control.on("connection", async (socket) => {
        const { username, role } = socket.data.user;
        const userAgent = socket.handshake.headers["user-agent"];

        // 🔍 Check if the manager already exists in memory
        let existingManager = sessionManager.getControlUser(username);
        if (existingManager) {
            console.log(`🔄 Restoring control session from memory for ${username}`);
            existingManager.initializeManagerSocket(socket);
            return;
        }

        // 🔍 Check if manager session exists in Redis
        const redisSession = await redisClient.pubClient.hGetAll(Channels.CONTROL(role, username));
        if (redisSession && Object.keys(redisSession).length > 0) {
            console.log(`🔄 Restoring control session from Redis for ${username}`);
            const restoredManager = await sessionManager.restoreControlUserFromRedis(redisSession, socket);
            if (restoredManager) return;
        }

        // 🚀 Create a new manager session
        await sessionManager.addControlUser(username, role, socket);

    });
}


function disconnectWithError(socket: any, message: string) {
    console.log(`🚨 ${message}`);
    socket.emit("error", { message });
    socket.disconnect();
}