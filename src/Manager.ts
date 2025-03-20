import { Socket } from "socket.io";
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
        this.initializeManagerSocket(socket);
        this.subscribeToRedisEvents();
    }

    public async initializeManagerSocket(socket: Socket) {
        this.resetSocketData();

        this.socketData = {
            socket: socket,
            heartbeatInterval: setInterval(() => { }, 0),
            reconnectionAttempts: 0,
            maxReconnectionAttempts: 3,
            reconnectionTimeout: null,
            cleanedUp: false
        };

        this.initializeSocketHandler();

        // ✅ Restart heartbeat when the manager reconnects
        sessionManager.startControlHeartbeat(this);

        // ✅ Send all active players when the manager first connects
        const allPlayers = await this.handleGetAllPlayers();
        this.sendData({ type: Events.PLAYGROUND_ALL, payload: allPlayers });

        // Handle disconnection logic
        this.socketData.socket.on("disconnect", () => {
            console.log(`Manager ${this.username} disconnected`);
            this.handleDisconnection();
        });
    }

    public subscribeToRedisEvents() {
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

    private async handleDisconnection() {
        // ❌ Stop the heartbeat when manager disconnects
        sessionManager.stopControlHeartbeat(this);

        clearInterval(this.socketData.heartbeatInterval);
        this.socketData.socket = null;

        this.socketData.reconnectionTimeout = setTimeout(async () => {
            console.log(`Removing manager ${this.username} due to prolonged disconnection`);
            await sessionManager.removeControlUser(this.username, this.role);
        }, 60000);
    }

    // TODO: Check we are using this
    private initializeSocketHandler() {
        if (this.socketData.socket) {
            this.socketData.socket.on("data", async (message, callback) => {
                try {
                    const res = message as { action: string; payload: any };
                    switch (res.action) {
                        case Events.PLAYGROUND_EXIT:
                            await this.forceRemovePlayer(res.payload.playerId, callback);
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

    private async forceRemovePlayer(
        playerId: string,
        callback?: (response: { success: boolean; message: string }) => void
    ) {
        try {
            console.log(`🚨 Manager requested forceful removal of player: ${playerId}`);

            const playerSession = sessionManager.getPlaygroundUser(playerId);
            if (!playerSession) {
                console.warn(`⚠️ Player ${playerId} is not in an active session.`);
                if (callback) callback({ success: false, message: "Player not found or already removed" });
                return;
            }

            // 🚀 Notify the player on the frontend
            playerSession.sendData({ type: Events.PLAYGROUND_EXIT, message: "You have been removed by the manager." }, "platform");

            // ⏳ Wait a moment to allow the client to process the message
            setTimeout(async () => {
                // ✅ Forcefully remove player session
                await sessionManager.endSession(playerId);

                console.log(`✅ Player ${playerId} forcefully removed by manager.`);

                if (callback) callback({ success: true, message: "Player successfully removed" });
            }, 500); // Delay to ensure message is received before disconnecting

        } catch (error) {
            console.error(`❌ Error forcefully removing player ${playerId}:`, error);
            if (callback) callback({ success: false, message: "Error removing player" });
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

    public async handleGetAllPlayers(): Promise<any[]> {
        try {
            const allPlayers: any[] = [];
            const playgroundKeys = await redisClient.pubClient.keys(Channels.PLAYGROUND("*"));

            for (const playerKey of playgroundKeys) {
                const playerData = await redisClient.pubClient.hGetAll(playerKey);

                if (Object.keys(playerData).length === 0) continue;

                let currentGame = null;
                if (playerData.currentGame && playerData.currentGame !== "null") {
                    try {
                        currentGame = JSON.parse(playerData.currentGame);

                        // ✅ Ensure gameName is always defined
                        if (!currentGame.gameName) {
                            currentGame.gameName = "Unknown Game";
                        }
                    } catch (error) {
                        console.error(`❌ Failed to parse currentGame for ${playerData.playerId}:`, error);
                    }
                }

                allPlayers.push({
                    playerId: playerData.playerId,
                    status: playerData.status,
                    initialCredits: playerData.initialCredits ? parseFloat(playerData.initialCredits) : 0,
                    currentCredits: playerData.currentCredits ? parseFloat(playerData.currentCredits) : 0,
                    managerName: playerData.managerName || null,
                    entryTime: playerData.entryTime ? new Date(playerData.entryTime) : null,
                    exitTime: playerData.exitTime && playerData.exitTime !== "null" ? new Date(playerData.exitTime) : null,
                    currentRTP: playerData.currentRTP ? parseFloat(playerData.currentRTP) : 0,
                    userAgent: playerData.userAgent || "Unknown",
                    currentGame: currentGame,
                    platformId: playerData.platformId || null,
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