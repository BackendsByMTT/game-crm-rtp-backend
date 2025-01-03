import { Socket } from "socket.io";
import { Player } from "./dashboard/users/userModel";
import { sessionManager } from "./dashboard/session/sessionManager";
import { PlatformSessionModel } from "./dashboard/session/sessionModel";


export interface socketConnectionData {
    socket: Socket | null;
    heartbeatInterval: NodeJS.Timeout;
    reconnectionAttempts: number;
    maxReconnectionAttempts: number;
    reconnectionTimeout: NodeJS.Timeout | null;
    cleanedUp: boolean;
}

//
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


    public initializeManager(socket: Socket) {
        this.resetSocketData();

        this.socketData = {
            socket: socket,
            heartbeatInterval: setInterval(async () => {
                if (this.socketData.socket) {
                    const activePlayers = await sessionManager.getPlayersSummariesByManager(this.username, this.role);
                    this.socketData.socket.emit("activePlayers", activePlayers);
                    this.sendData({ type: "CREDITS", payload: { credits: this.credits, role: this.role } })
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
        this.sendData({ type: "CREDITS", payload: { credits: this.credits, role: this.role } })
    }

    private handleDisconnection() {
        clearInterval(this.socketData.heartbeatInterval); // Clear heartbeat on disconnect
        this.socketData.socket = null;

        this.socketData.reconnectionTimeout = setTimeout(() => {
            console.log(`Removing manager ${this.username} due to prolonged disconnection`);
            sessionManager.deleteManagerByUsername(this.username)
        }, 60000); // 1-minute timeout for reconnection
    }


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
            const playerSocket = sessionManager.getPlayerPlatform(data.playerId)

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

    public sendMessage(data: any) {
        if (this.socketData.socket) {
            this.socketData.socket.emit("message", data)
        }
    }

    public sendData(data: any) {
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