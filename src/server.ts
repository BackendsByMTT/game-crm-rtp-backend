import cluster from "cluster";
import { Server } from "socket.io";
import { socketAuth } from "./dashboard/middleware/socketAuth";
import { sessionManager } from "./dashboard/session/sessionManager";
import PlayerSocket from "./Player";
import { Player as PlayerModel, User } from "./dashboard/users/userModel";
import { IUser } from "./dashboard/users/userType";
import { messageType } from "./game/Utils/gameUtils";
import Manager from "./Manager";
import { createAdapter } from "@socket.io/redis-adapter";
import { redisClient } from "./config/redis";

const getPlayerDetails = async (username: string) => {
    const player = await PlayerModel.findOne({ username }).populate<{ createdBy: IUser }>("createdBy", "username");
    if (player) {
        return {
            credits: player.credits,
            status: player.status,
            managerName: player.createdBy?.username || null
        };
    }
    throw new Error("Player not found");
};

const getManagerDetails = async (username: string) => {
    const manager = await User.findOne({ username });
    if (manager) {
        return { credits: manager.credits, status: manager.status }
    }
    throw new Error("Manager not found");

}

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

    console.log(`⚡ WebSocket server running on worker ${cluster.worker?.id}`);

    // **Playground Namespace (For Players)**
    namespaces.playground.on("connection", async (socket) => {
        const { username, role } = socket.data.user;
        if (role !== "player") return socket.disconnect();

        const playgroundId = socket.handshake.auth.playgroundId;
        const userAgent = socket.handshake.headers["user-agent"];

        if (!playgroundId) return disconnectWithError(socket, "No playgroundId provided");

        let existingSession = await sessionManager.getPlaygroundSession(username);
        if (existingSession?.platformData?.socket.connected) {
            if (existingSession.platformData.platformId === playgroundId) {
                return disconnectWithError(socket, "Already connected in playground");
            }
            return disconnectWithError(socket, "Cannot connect to multiple playgrounds simultaneously");
        }

        try {
            const playerDetails = await getPlayerDetails(username);
            let player: PlayerSocket;
            if (existingSession) {
                existingSession.initializePlatformSocket(socket);
                player = existingSession; // TypeScript now knows it's a PlayerSocket
            } else {
                player = new PlayerSocket(username, role, playerDetails.status, playerDetails.credits, userAgent, socket, playerDetails.managerName);
            }

            player.platformData.platformId = playgroundId;
            player.sendAlert(`🎮 Welcome to Playground ${playgroundId}`, false);
        } catch (error) {
            disconnectWithError(socket, "Failed to retrieve player details.");
        }
    });

    // **Game Namespace (For Players)**
    namespaces.game.on("connection", async (socket) => {
        try {
            const { username, role, userAgent } = socket.data.user;
            const gameId = socket.handshake.auth.gameId;
            if (role !== "player") return socket.disconnect();

            console.log(`🎰 Player ${username} is attempting to enter the Arena`);

            // Validate Redis Session
            const playgroundSession = await redisClient.pubClient.hGetAll(`playground:${username}`);
            if (!playgroundSession || Object.keys(playgroundSession).length === 0) {
                console.log(`❌ No active Redis session found for player ${username}`);
                return disconnectWithError(socket, "You must be connected to the Playground first.");
            }

            if (playgroundSession.status !== "active") {
                console.log(`🚫 Player ${username} is inactive`);
                return disconnectWithError(socket, "Your account is inactive. Please contact support.");
            }

            const currentGame = playgroundSession.currentGame && playgroundSession.currentGame !== "null"
                ? JSON.parse(playgroundSession.currentGame)
                : null;

            if (currentGame) {
                console.log(`⚠️ Player ${username} is already in a game: ${currentGame.gameId}`);
                return disconnectWithError(socket, "You are already playing a game. Finish your current session first.");
            }

            // Validate In - Memory Session **
            let existingSession = await sessionManager.getPlaygroundSession(username);
            if (!existingSession || !existingSession.platformData?.socket.connected) {
                return disconnectWithError(socket, "You must be connected to a Playground first.");
            }

            console.log(`🎰 Player ${username} entering game, updating socket session`);

            await existingSession.updateGameSocket(socket);
            existingSession.sendAlert(`🎰 Welcome to the Game: ${existingSession.currentGameData.gameId}`);
        } catch (error) {
            return disconnectWithError(socket, "Failed to enter the Arena");
        }

    });

    // **Control Namespace (For Admins and Moderators)**
    namespaces.control.on("connection", async (socket) => {
        const { username, role } = socket.data.user;
        const { credits } = await getManagerDetails(username);
        const userAgent = socket.handshake.headers["user-agent"];

        let existingManager = sessionManager.getActiveManagerByUsername(username);
        if (existingManager) {
            if (existingManager.socketData.reconnectionTimeout) {
                clearTimeout(existingManager.socketData.reconnectionTimeout);
            }
            existingManager.initializeManager(socket);
            socket.emit(messageType.ALERT, `Manager ${username} has been reconnected.`);
        } else {
            const newManager = new Manager(username, credits, role, userAgent, socket);
            sessionManager.addManager(username, newManager)
            socket.emit(messageType.ALERT, `Manager ${username} has been connected.`);
        }

    });
}

function disconnectWithError(socket: any, message: string) {
    console.log(`🚨 ${message}`);
    socket.emit("error", { message });
    socket.disconnect();
}