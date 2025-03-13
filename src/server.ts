import cluster from "cluster";
import { Server } from "socket.io";
import { socketAuth } from "./dashboard/middleware/socketAuth";
import { sessionManager } from "./dashboard/session/sessionManager";
import PlayerSocket from "./Player";
import { Player as PlayerModel } from "./dashboard/users/userModel";
import { IUser } from "./dashboard/users/userType";

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

export function setupWebSocket(server: any, corsOptions: any) {
    const io = new Server(server, { cors: corsOptions });
    io.use(socketAuth);

    const namespaces = {
        playground: io.of("/playground"),
        control: io.of("/control"),
        game: io.of("/game")
    };

    Object.values(namespaces).forEach((ns) => ns.use(socketAuth));

    // io.on("connection", async (socket) => {
    //     const { username, role, userAgent } = socket.data.user;
    //     const gameId = socket.handshake.auth.gameId;
    //     if (role !== "player") return socket.disconnect();

    //     console.log(`🎰 Player ${username} is attempting to enter the Arena`);
    //     let existingSession = sessionManager.getPlayerPlatform(username);
    //     // Check if player has an active playground session
    //     if (!existingSession || !existingSession.platformData?.socket.connected) {
    //         return disconnectWithError(socket, "You must be connected to a Playground first.");
    //     }

    //     // Always treat `updateGameSocket` as the first game session entry
    //     console.log(`🎰 Player ${username} entering game, updating socket session`);
    //     await existingSession.updateGameSocket(socket);
    //     existingSession.sendAlert(`🎰 Welcome to the Arena : ${existingSession.currentGameData.gameId}`);

    // });

    namespaces.game.on("connection", async (socket) => {
        const { username, role, userAgent } = socket.data.user;
        const gameId = socket.handshake.auth.gameId;
        if (role !== "player") return socket.disconnect();

        console.log(`🎰 Player ${username} is attempting to enter the Arena`);
        let existingSession = sessionManager.getPlayerPlatform(username);
        // Check if player has an active playground session
        if (!existingSession || !existingSession.platformData?.socket.connected) {
            return disconnectWithError(socket, "You must be connected to a Playground first.");
        }

        // Always treat `updateGameSocket` as the first game session entry
        console.log(`🎰 Player ${username} entering game, updating socket session`);
        await existingSession.updateGameSocket(socket);
        existingSession.sendAlert(`🎰 Welcome to the Arena : ${existingSession.currentGameData.gameId}`);
    });

    // **Playground Namespace (For Players)**
    namespaces.playground.on("connection", async (socket) => {
        const { username, role } = socket.data.user;
        if (role !== "player") return socket.disconnect();

        const playgroundId = socket.handshake.auth.playgroundId;
        const userAgent = socket.handshake.headers["user-agent"];

        console.log("PLAYGROUND : ", userAgent)

        if (!playgroundId) return disconnectWithError(socket, "No playgroundId provided");

        let existingSession = sessionManager.getPlayerPlatform(username);
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

    namespaces.control.on("connection", (socket) => {
        const { username, role } = socket.data.user;
        if (!["admin", "moderator"].includes(role)) return socket.disconnect();

        console.log(`🛠️ ${role} ${username} entered the Control Room`);

        socket.on("monitor-player", (data) => console.log(`👀 ${username} is monitoring`, data));
        socket.on("kick-player", (playerId) => namespaces.playground.to(playerId).emit("kicked", { message: "You have been removed by an admin" }));
        socket.on("disconnect", () => console.log(`🛠️ ${role} ${username} left the Control Room`));
    });

    console.log(`⚡ WebSocket server running on worker ${cluster.worker?.id}`);
}

function disconnectWithError(socket: any, message: string) {
    console.log(`🚨 ${message}`);
    socket.emit("error", { message });
    socket.disconnect();
}