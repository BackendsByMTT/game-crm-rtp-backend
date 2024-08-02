import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { Player as PlayerModel } from "./dashboard/users/userModel";
import { config } from "./config/config";
import Player from "./Player";


interface DecodedToken {
    username: string;
    role?: string;
}

export let users: Map<string, Player> = new Map();


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

const getUserCredits = async (username: string): Promise<number> => {
    const player = await PlayerModel.findOne({ username });
    if (player) {
        return player.credits;
    }
    throw new Error("User not found");
};

const socketController = (io: Server) => {

    // Token verification middleware
    io.use(async (socket: Socket, next: (err?: Error) => void) => {
        const userAgent = socket.request.headers['user-agent'];
        try {
            const decoded = await verifySocketToken(socket);
            const credits = await getUserCredits(decoded.username);

            (socket as any).decoded = { ...decoded, credits };
            (socket as any).userAgent = userAgent;
            next();
        } catch (error) {
            console.error("Authentication error:", error.message);
            next(error);
        }
    });

    io.on("connection", async (socket) => {
        const decoded = (socket as any).decoded;

        if (!decoded || !decoded.username || !decoded.role) {
            console.error("Connection rejected: missing required fields in token");
            socket.disconnect(true);
            return;
        }


        const userAgent = (socket as any).userAgent;
        const username = decoded.username;

        const existingUser = users.get(username);

        if (existingUser) {
            if (existingUser.userAgent !== userAgent) {
                socket.emit("AnotherDevice", "You are already playing on another browser.");
                socket.disconnect(true);
                return;
            }

            // if (existingUser.gameSocket) {
            //     socket.emit("alert", "You are already connected from another tab.");
            //     socket.disconnect(true);
            //     return;
            // }

            await existingUser.updateGameSocket(socket);
            existingUser.sendAlert(`Game socket created for ${username}`);
            
            return;
        }

        // This is a new user connecting
        const newUser = new Player(username, decoded.role, decoded.credits, userAgent, socket);
        users.set(username, newUser);
        newUser.sendAlert(`Welcome, ${newUser.username}!`);
        

        // 

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
