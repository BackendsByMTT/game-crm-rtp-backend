import { Socket } from "socket.io";
import { verifyPlayerToken } from "./utils/playerAuth";
import { getPlayerCredits } from "./game/Global";
import { Platform } from "./dashboard/games/gameModel";
import { Payouts } from "./dashboard/games/gameModel";

import SlotGame from "./dashboard/games/slotGame";
import { gameData } from "./game/slotBackend/testData";

export let users: Map<string, SocketUser> = new Map();


export class SocketUser {
    socketReady: boolean = false;
    socket: Socket
    username: string;
    role: string;
    credits: number;
    currentGame: any;
    platform: boolean;
    socketID: string;
    gameSettings: any;
    gameTag: string;
    heartbeatInterval: NodeJS.Timeout;


    constructor(socket: Socket, platformData: any, gameSetting: any) {
        this.initializeUser(socket, platformData, gameSetting);
    }

    async initializeUser(socket: Socket, platformData: any, gameSetting: any) {
        try {
            if (!platformData) {
                throw new Error("Platform data is missing");
            }
            this.socketReady = true;
            this.socket = socket
            this.platform = true;
            this.socketID = socket.id;
            this.username = platformData.username;
            this.role = platformData.role;
            this.credits = platformData.credits;

            this.initGameData()
            this.disconnectHandler()
            this.startHeartbeat();
            this.onExit()

            socket.emit("socketState", this.socketReady);

            console.log(
                `User ${this.username} initialized with socket ID: ${this.socketID}`
            );
        } catch (error) {
            console.error(`Error initializing user ${this.username}:`, error);
            if (socket.connected) {
                socket.emit("internalError", error.message);
            }
            socket.disconnect();
        }
    }

    private initGameData() {
        this.socket.on("AUTH", async (message) => {
            try {
                const res = JSON.parse(message);
                const tagName = res.Data.GameID;

                const platform = await Platform.aggregate([
                    { $unwind: "$games" },
                    { $match: { "games.tagName": tagName, "games.status": 'active' } },
                    { $project: { _id: 0, game: "$games" } },
                ]);

                if (platform.length === 0) {
                    this.gameSettings = { ...gameData[0] }
                    new SlotGame({ username: this.username, credits: this.credits, socket: this.socket }, this.gameSettings);
                    return

                }
                const game = platform[0].game;
                const payoutData = await Payouts.find({ _id: { $in: game.payout } });

                this.gameSettings = { ...payoutData[0].data }
                new SlotGame({ username: this.username, credits: this.credits, socket: this.socket }, this.gameSettings);

            } catch (error) {
                console.error(`Error initializing game data for user ${this.username}:`, error);
            }
        })
    }

    public sendMessage(action: string, message: any) {
        this.socket.emit("message", JSON.stringify({ id: action, message, username: this.username }))
    }

    public sendError(message: string) {
        this.socket.emit("internalError", message);
    }

    public sendAlert(message: string) {
        this.socket.emit("alert", message)
    }

    private startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.socket) {
                this.sendAlert(`I'm Alive ${this.username}`);
            }
        }, 20000); // 20 seconds
    }


    public disconnectHandler() {
        this.socket.on("disconnect", (reason) => {
            console.log("User disconnected ", this.username);

            // Handle cleanup logic
            this.socketReady = false;
            users.delete(this.username)

            // Clear the heartbeat interval
            clearInterval(this.heartbeatInterval);

            // Call the cleanup method
            this.cleanup();

        });
    }

    private cleanup() {
        // Nullify all properties to ensure the object is destroyed
        this.socket = null;
        this.username = null;
        this.role = null;
        this.credits = null;
        this.currentGame = null;
        this.platform = null;
        this.socketID = null;
        this.gameSettings = null;
        this.gameTag = null;
    }

    private onExit() {
        this.socket.on("exit", () => {
            users.delete(this.username)
            this.socket.disconnect();
            console.log("User exited");

        })
    }
}

//ENTER THE USER AND CHECK JWT TOKEN 
export default async function enterPlayer(socket: Socket) {
    try {
        const platformData = await getPlatformData(socket);
        const gameSetting = getGameSettings();

        if (!platformData.username || !platformData.role) {
            throw new Error("Invalid platform data");
        }

        const existingUser = users.get(platformData.username);
        if (existingUser) {
            throw new Error("User already logged in from another device.");
        }

        socket.data = { platformData, gameSetting };
        const newUser = new SocketUser(socket, platformData, gameSetting);
        users.set(platformData.username, newUser);

        socket.emit("alert", `Welcome, ${platformData.username}!`);
        console.log(`Player ${platformData.username} entered the game.`);

    } catch (error) {
        console.error("Error during player entry:", error);
        if (socket.connected) {
            socket.emit("internalError", error.message);
        }
        socket.disconnect(true); // Forcefully disconnect to clean up resources
    }
}

async function getPlatformData(socket: Socket) {
    try {
        const decoded = await verifyPlayerToken(socket);
        const credits = await getPlayerCredits(decoded.username);
        return {
            username: decoded.username,
            role: decoded.role,
            credits: typeof credits === "number" ? credits : 0,
        };
    } catch (error) {
        console.error("Failed to get platform data:", error);
        throw error;
    }
}



function getGameSettings() {
    // Retrieve game settings from a database or configuration file
    return {
        gameSetting: {},
    };
}

