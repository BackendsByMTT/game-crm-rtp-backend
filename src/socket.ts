import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { Player as PlayerModel, User } from "./dashboard/users/userModel";
import { config } from "./config/config";
import Player from "./Player";
import { messageType } from "./game/Utils/gameUtils";
import Manager from "./Manager";
import { sessionManager } from "./dashboard/session/sessionManager";
import { IUser } from "./dashboard/users/userType";


interface DecodedToken {
    username: string;
    role?: string;
}

const verifySocketToken = (socket: Socket): Promise<DecodedToken> => {
    return new Promise((resolve, reject) => {
        const token = socket.handshake.auth.token;
        if (token) {
            jwt.verify(token, config.jwtSecret, (err, decoded) => {
                if (err) {
                    console.error("Token verification failed:", err.message);
                    reject(new Error("You are not authenticated"));
                } else if (!decoded || !decoded.username) {
                    reject(new Error("Token does not contain required fields"));
                } else {
                    resolve(decoded as DecodedToken);
                }
            });
        } else {
            reject(new Error("No authentication token provided"));
        }
    });
};

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

const handlePlayerConnection = async (socket: Socket, decoded: DecodedToken, userAgent: string) => {
    try {
        const username = decoded.username;
        const platformId = socket.handshake.auth.platformId;
        const origin = socket.handshake.auth.origin;
        const gameId = socket.handshake.auth.gameId;
        const { credits, status, managerName } = await getPlayerDetails(username);

        let existingPlayer = sessionManager.getPlayerPlatform(username);

        if (existingPlayer) {
            // Platform connection handling
            if (origin) {
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

            // Game connection handling
            if (gameId || !gameId) {
                if (!existingPlayer.platformData.socket || !existingPlayer.platformData.socket.connected) {
                    console.log("Platform connection required before joining a game.");
                    socket.emit(messageType.ERROR, "Platform connection required before joining a game.");
                    socket.disconnect(true);
                    return;
                }

                console.log("Game connection attempt detected, ensuring platform stability");
                await existingPlayer.updateGameSocket(socket);
                existingPlayer.sendAlert(`Game initialized for ${username} in game ${gameId}`);
                return;
            }
        }

        // New platform connection
        if (origin) {
            const newUser = new Player(username, decoded.role, status, credits, userAgent, socket, managerName);
            newUser.platformData.platformId = platformId;
            newUser.sendAlert(`Player initialized for ${username} on platform ${origin}`, false);
            return;
        }

        // Game connection without existing platform connection
        if (process.env.NODE_ENV === "testing") {
            console.log("Testing environment detected. Creating platform socket for the player.");

            const mockPlatformSocket = {
                handshake: { auth: { platformId: `test-platform-${username}` } },
                connected: true,
                emit: socket.emit.bind(socket),
                disconnect: socket.disconnect.bind(socket),
                on: socket.on.bind(socket),
            } as unknown as Socket;

            const testPlayer = new Player(
                username,
                decoded.role,
                status,
                credits,
                userAgent,
                mockPlatformSocket,
                managerName
            );

            testPlayer.platformData.platformId = `test-platform-${username}`;
            await testPlayer.updateGameSocket(socket);
            return;
        }

        // Invalid connection attempt
        socket.emit(messageType.ERROR, "Invalid connection attempt.");
        // socket.disconnect(true);
    } catch (error) {
        console.error(`Error in handlePlayerConnection for user ${decoded?.username || 'unknown'}:`, error);
        socket.emit(messageType.ERROR, `Error in handlePlayerConnection for user ${decoded?.username || 'unknown'}:`, error);
        socket.disconnect(true);
    }

};


const handleManagerConnection = async (socket: Socket, decoded: DecodedToken, userAgent: string) => {
    const username = decoded.username;
    const role = decoded.role
    const { credits } = await getManagerDetails(username);
    console.log("MANAGER CONNECTION")

    let existingManager = sessionManager.getActiveManagerByUsername(username);

    if (existingManager) {
        console.log(`Reinitializing manager ${username}`);

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

    // Send all active players to the manager upon connection
    // const activeUsersData = Array.from(sessionManager.getPlatformSessions().values()).map(player => {
    //     const platformSession = sessionManager.getPlayerPlatform(player.playerData.username);
    //     return platformSession?.getSummary() || {};
    // });

    // socket.emit("activePlayers", activeUsersData);
};


const socketController = (io: Server) => {

    // Token verification middleware
    io.use(async (socket: Socket, next: (err?: Error) => void) => {
        const userAgent = socket.request.headers['user-agent'];
        try {
            const decoded = await verifySocketToken(socket);
            (socket as any).decoded = { ...decoded };
            (socket as any).userAgent = userAgent;
            next();
        } catch (error) {
            console.error("Authentication error:", error.message);
            next(error);
        }
    });

    io.on("connection", async (socket) => {
        try {
            const decoded = (socket as any).decoded;
            const userAgent = (socket as any).userAgent;
            const role = decoded.role;


            if (role === "player") {
                await handlePlayerConnection(socket, decoded, userAgent);
            } else if (['admin', 'supermaster', 'master', 'distributor', 'subdistributor', 'store'].includes(role)) {
                await handleManagerConnection(socket, decoded, userAgent)
            } else {
                console.error("Unsupported role : ", role);
                socket.disconnect(true);
            }

        } catch (error) {
            console.error("An error occurred during socket connection:", error.message);
            socket.emit("alert", "ForcedExit");
            socket.disconnect(true);
        }
    });


    // Error handling middleware
    io.use((socket: Socket, next: (err?: Error) => void) => {
        socket.on('error', (err: Error) => {
            console.error('Socket Error:', err);
            socket.disconnect(true);
        });
        next();
    });
};

export default socketController;