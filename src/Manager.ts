import { Socket } from "socket.io";
import { Player } from "./dashboard/users/userModel";
import { sessionManager } from "./dashboard/session/sessionManager";
import { PlatformSessionModel } from "./dashboard/session/sessionModel";
import { redisClient } from "./config/redis";
import { Channels, Events } from "./utils/events";


export interface socketConnectionData {
    socket: Socket | null;
    heartbeatInterval: NodeJS.Timeout;
    reconnectionAttempts: number;
    maxReconnectionAttempts: number;
    reconnectionTimeout: NodeJS.Timeout | null;
    cleanedUp: boolean;
}

export default class Manager {
    username: string;
    credits: number;
    role: string;
    userAgent: string;
    socketData: socketConnectionData;

    constructor(username: string, credits: number, role: string, userAgent: string, socket: Socket) {
        this.username = username;
        this.credits = credits;
        this.role = role;
        this.userAgent = userAgent;
        this.initializeManager(socket);
        this.subscribeToRedisEvents();
    }


    private subscribeToRedisEvents() {
        const channel = Channels.CONTROL(this.role, this.username);

        redisClient.subClient.subscribe(channel, (message) => {
            const data = JSON.parse(message);
            console.log(`🔄 Syncing state for ${this.username}:`, data);

            switch (data.type) {
                case Events.CONTROL_CREDITS:
                    this.credits = data.payload.credits;
                    this.sendData({ type: Events.CONTROL_CREDITS, payload: this.credits });
                    break;

                case Events.PLAYGROUND_ENTER:
                    this.sendData({ type: Events.PLAYGROUND_ENTER, payload: data.payload });
                    break;

                case Events.PLAYGROUND_EXIT:
                    this.sendData({ type: Events.PLAYGROUND_EXIT, payload: data.payload });
                    break;

                case Events.PLAYGROUND_GAME_ENTER:
                    this.sendData({ type: Events.PLAYGROUND_GAME_ENTER, payload: data.payload });
                    break;

                case Events.PLAYGROUND_GAME_EXIT:
                    this.sendData({ type: Events.PLAYGROUND_GAME_EXIT, payload: data.payload });
                    break;

                case Events.PLAYGROUND_GAME_SPIN:
                    this.sendData({ type: Events.PLAYGROUND_GAME_SPIN, payload: data.payload });
                    break;

                case Events.PLAYGROUND_ALL:
                    this.handleGetAllPlayers();
                    break;

                default:
                    console.log(`Unknown message type: ${data.type}`);
            }
        })
    }

    private resetSocketData() {
        if (this.socketData) {
            if (this.socketData.socket) {
                this.socketData.socket.removeAllListeners();
                this.socketData.socket.disconnect();
            }
            clearInterval(this.socketData.heartbeatInterval);
            if (this.socketData.reconnectionTimeout) {
                clearTimeout(this.socketData.reconnectionTimeout);
                this.socketData.reconnectionTimeout = null;
            }

            this.socketData.socket = null;
        }
    }


    public async initializeManager(socket: Socket) {
        this.resetSocketData();

        this.socketData = {
            socket: socket,
            heartbeatInterval: setInterval(async () => {
                if (this.socketData.socket) {
                    const allActivePlayers = await this.handleGetAllPlayers();
                    this.sendData({ type: Events.PLAYGROUND_ALL, payload: allActivePlayers });

                    this.sendData({
                        type: Events.CONTROL_CREDITS,
                        payload: { credits: this.credits, role: this.role, worker: process.pid }
                    });
                }
            }, 5000),
            reconnectionAttempts: 0,
            maxReconnectionAttempts: 3,
            reconnectionTimeout: null,
            cleanedUp: false
        }

        this.initializeSocketHandler();

        this.socketData.socket.on("disconnect", () => {
            console.log(`Manager ${this.username} disconnected`);
            this.handleDisconnection();
        });

    }

    private async handleDisconnection() {

        clearInterval(this.socketData.heartbeatInterval);
        this.socketData.socket = null;

        this.socketData.reconnectionTimeout = setTimeout(async () => {
            console.log(`Removing manager ${this.username} due to prolonged disconnection`);
            await sessionManager.removeControlUser(this.username);
        }, 60000);
    }


    // TODO: Check we are using this
    private initializeSocketHandler() {
        if (this.socketData.socket) {
            this.socketData.socket.on("data", async (message, callback) => {
                try {
                    const res = message as { action: string; payload: any };
                    switch (res.action) {
                        case "PLAYER_STATUS":
                            await this.playerStatusHandler(res.payload, callback);
                            break;

                        case "PLAYER_SESSION":
                            await this.playerSessionHandler(res.payload, callback);
                            break;
                    }
                } catch (error) {
                    console.log("Error handling socket data:", error);
                    if (callback) callback({ success: false, message: "Internal error" });
                }
            });
        }
    }




    public notifyManager(data: { type: string, payload: any }) {
        if (this.socketData.socket) {
            this.socketData.socket.emit("PLATFORM", data);
        } else {
            console.error(`Socket is not available for manager ${this.username}`);
        }
    }

    private async playerStatusHandler(
        data: { playerId: string; status: string },
        callback?: (response: { success: boolean; message: string }) => void
    ) {
        try {
            // Attempt to retrieve the player document
            const player = await Player.findOne({ username: data.playerId });

            if (!player) {
                console.log("Player not found:", data.playerId);
                if (callback) callback({ success: false, message: "Player not found" });
                return;
            }

            // Attempt to update the status field
            const updateResult = await Player.updateOne(
                { username: data.playerId },
                { $set: { status: data.status } }
            );

            // Check if the update was successful using modifiedCount
            if (updateResult.modifiedCount === 0) {
                console.warn(`No document modified for player: ${data.playerId}`);
                if (callback) callback({ success: false, message: "No changes made to status" });
                return;
            }

            // Notify the player socket of the status change
            const playerSocket = await sessionManager.getPlaygroundUser(data.playerId)

            if (playerSocket) {
                if (data.status === "inactive") {
                    await playerSocket.forceExit(false);
                    console.log(`Player ${data.playerId} exited from platform due to inactivity`);
                } else {
                    playerSocket.sendData({ type: "STATUS", data: { status: data.status } }, "platform");
                }
            }

            if (callback) callback({ success: true, message: "Status updated successfully" });
        } catch (error) {
            console.error("Error updating player status:", error);
            if (callback) callback({ success: false, message: "Error updating status" });
        }
    }

    private async playerSessionHandler(
        data: { playerId: string },
        callback?: (response: { success: boolean; message: string; sessionData?: any[] }) => void
    ) {
        try {
            // Retrieve all platform session data for the player
            const platformSessions = await PlatformSessionModel.find({ playerId: data.playerId }).lean();

            if (!platformSessions || platformSessions.length === 0) {
                console.log("No session data found for player:", data.playerId);
                if (callback) callback({ success: false, message: "No session data found for this player" });
                return;
            }

            // Return all session data to the client
            if (callback) callback({ success: true, message: "All session data retrieved successfully", sessionData: platformSessions });
        } catch (error) {
            console.error("Error retrieving player session data:", error);
            if (callback) callback({ success: false, message: "Error retrieving session data" });
        }
    }

    private async handleGetAllPlayers(): Promise<any[]> {
        try {
            const allPlayers: any[] = [];
            const playgroundKeys = await redisClient.pubClient.keys("playground:*");

            for (const playerKey of playgroundKeys) {
                const playerData = await redisClient.pubClient.hGetAll(playerKey);

                // Ensure playerData exists
                if (Object.keys(playerData).length === 0) continue;

                allPlayers.push({
                    username: playerData.playerId,
                    status: playerData.status,
                    currentCredits: playerData.currentCredits ? parseFloat(playerData.currentCredits) : 0,
                    platformId: playerData.platformId || null,
                    managerName: playerData.managerName || null,
                    entryTime: playerData.entryTime ? new Date(playerData.entryTime) : null,
                    exitTime: playerData.exitTime && playerData.exitTime !== "null" ? new Date(playerData.exitTime) : null,
                    currentRTP: playerData.currentRTP ? parseFloat(playerData.currentRTP) : 0,
                    currentGame: playerData.currentGame && playerData.currentGame !== "null"
                        ? JSON.parse(playerData.currentGame)
                        : null,
                    userAgent: playerData.userAgent || "Unknown",
                });
            }

            return allPlayers;
        } catch (error) {
            console.error("❌ Error fetching all playground players from Redis:", error);
            return [];
        }
    }

    public sendMessage(data: any) {
        if (this.socketData.socket) {
            this.socketData.socket.emit("message", data)
        }
    }

    public sendData(data: { type: Events, payload: any }) {
        if (this.socketData.socket) {
            this.socketData.socket.emit("data", data)
        }
    }

    public sendAlert(data: any) {
        if (this.socketData.socket) {
            this.socketData.socket.emit("alert", data)
        }
    }
}