import { Socket } from "socket.io";
import { verifyPlayerToken } from "./utils/playerAuth";
import { getPlayerCredits } from "./game/Global";
import { Platform } from "./dashboard/games/gameModel";
import { Payouts } from "./dashboard/games/gameModel";

import SlotGame from "./dashboard/games/slotGame";
import { gameData } from "./game/slotBackend/testData";
import { users } from "./socket";


export default class Player {
    username: string;
    role: string;
    credits: number;
    userAgent: string;

    gameSocket: Socket | null;
    gameSettings: any;
    currentGame: SlotGame | null = null;

    heartbeatInterval: NodeJS.Timeout;
    reconnectionAttempts: number = 0;
    maxReconnectionAttempts: number = 3;
    reconnectionTimeout: number = 5000; // 5 seconds

    constructor(username: string, role: string, credits: number, userAgent: string, gameSocket: Socket) {

        this.username = username;
        this.role = role;
        this.credits = credits;
        this.userAgent = userAgent;
        this.gameSocket = gameSocket;
        this.initializeGameSocket(gameSocket)
    }

    initializeGameSocket(socket: Socket) {
        this.gameSocket = socket;
        this.gameSocket.on("disconnect", () => this.handleGameDisconnection());
        this.initGameData();
        this.startHeartbeat();
        this.onExit();
        socket.emit("socketState", true);

        console.log(`User ${this.username} initialized with game socket ID: ${this.gameSocket.id}`);
    }

    handleGameDisconnection() {
        console.log(`User ${this.username} disconnected from game. Attempting to reconnect...`);
        this.attemptReconnection();
    }

    async attemptReconnection() {
        try {
            while (this.reconnectionAttempts < this.maxReconnectionAttempts) {
                await new Promise(resolve => setTimeout(resolve, this.reconnectionTimeout));
                this.reconnectionAttempts++;

                if (this.gameSocket && this.gameSocket.connected) {
                    console.log(`User ${this.username} reconnected successfully.`);
                    this.reconnectionAttempts = 0;
                    return;
                }

                console.log(`Reconnection attempt ${this.reconnectionAttempts} for user ${this.username}...`);
            }

            console.log(`User ${this.username} failed to reconnect after ${this.maxReconnectionAttempts} attempts.`);
            users.delete(this.username);
            this.cleanup();


        } catch (error) {
            console.log("ERROR: Attempt to reconnect:", error);
        }
    }

    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.gameSocket) {
                this.sendAlert(`I'm Alive ${this.username}`);
            }
        }, 20000); // 20 seconds
    }

    sendAlert(message: string) {
        if (this.gameSocket) {
            this.gameSocket.emit("alert", message);
        }
    }

    cleanup() {
        if (this.gameSocket) {
            this.gameSocket.disconnect();
            this.gameSocket = null;
        }
        clearInterval(this.heartbeatInterval);
    }

    onExit() {
        if (this.gameSocket) {
            this.gameSocket.on("exit", () => {
                users.delete(this.username);
                this.cleanup();
                console.log("User exited");
            });
        }
    }


    async updateGameSocket(socket: Socket) {
        if (socket.request.headers['user-agent'] !== this.userAgent) {
            socket.emit("alert", "You are already playing on another browser.");
            socket.disconnect(true);
            return;
        }
        this.initializeGameSocket(socket);
        const credits = await getPlayerCredits(this.username);
        this.credits = typeof credits === "number" ? credits : 0;
    }

    private async initGameData() {
        if (!this.gameSocket) return;

        this.gameSocket.on("AUTH", async (message) => {
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
                    new SlotGame({ username: this.username, credits: this.credits, socket: this.gameSocket }, this.gameSettings);
                    return

                }
                const game = platform[0].game;
                const payoutData = await Payouts.find({ _id: { $in: game.payout } });

                this.gameSettings = { ...payoutData[0].data }
                this.currentGame = new SlotGame({ username: this.username, credits: this.credits, socket: this.gameSocket }, this.gameSettings);

            } catch (error) {
                console.error(`Error initializing game data for user ${this.username}:`, error);
            }
        })
    }
}


