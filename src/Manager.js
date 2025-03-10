"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const userModel_1 = require("./dashboard/users/userModel");
const sessionManager_1 = require("./dashboard/session/sessionManager");
const sessionModel_1 = require("./dashboard/session/sessionModel");
//
class Manager {
    constructor(username, credits, role, userAgent, socket) {
        this.username = username;
        this.credits = credits;
        this.role = role;
        this.userAgent = userAgent;
        this.initializeManager(socket);
    }
    resetSocketData() {
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
    initializeManager(socket) {
        this.resetSocketData();
        this.socketData = {
            socket: socket,
            heartbeatInterval: setInterval(() => __awaiter(this, void 0, void 0, function* () {
                if (this.socketData.socket) {
                    const activePlayers = yield sessionManager_1.sessionManager.getPlayersSummariesByManager(this.username, this.role);
                    this.socketData.socket.emit("activePlayers", activePlayers);
                    this.sendData({ type: "CREDITS", payload: { credits: this.credits, role: this.role } });
                }
            }), 5000),
            reconnectionAttempts: 0,
            maxReconnectionAttempts: 3,
            reconnectionTimeout: null,
            cleanedUp: false
        };
        this.initializeSocketHandler();
        this.socketData.socket.on("disconnect", () => {
            console.log(`Manager ${this.username} disconnected`);
            this.handleDisconnection();
        });
        this.sendData({ type: "CREDITS", payload: { credits: this.credits, role: this.role } });
    }
    handleDisconnection() {
        clearInterval(this.socketData.heartbeatInterval); // Clear heartbeat on disconnect
        this.socketData.socket = null;
        this.socketData.reconnectionTimeout = setTimeout(() => {
            console.log(`Removing manager ${this.username} due to prolonged disconnection`);
            sessionManager_1.sessionManager.deleteManagerByUsername(this.username);
        }, 60000); // 1-minute timeout for reconnection
    }
    initializeSocketHandler() {
        if (this.socketData.socket) {
            this.socketData.socket.on("data", (message, callback) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const res = message;
                    switch (res.action) {
                        case "PLAYER_STATUS":
                            yield this.playerStatusHandler(res.payload, callback);
                            break;
                        case "PLAYER_SESSION":
                            yield this.playerSessionHandler(res.payload, callback);
                            break;
                    }
                }
                catch (error) {
                    console.log("Error handling socket data:", error);
                    if (callback)
                        callback({ success: false, message: "Internal error" });
                }
            }));
        }
    }
    notifyManager(data) {
        if (this.socketData.socket) {
            this.socketData.socket.emit("PLATFORM", data);
        }
        else {
            console.error(`Socket is not available for manager ${this.username}`);
        }
    }
    playerStatusHandler(data, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Attempt to retrieve the player document
                const player = yield userModel_1.Player.findOne({ username: data.playerId });
                if (!player) {
                    console.log("Player not found:", data.playerId);
                    if (callback)
                        callback({ success: false, message: "Player not found" });
                    return;
                }
                // Attempt to update the status field
                const updateResult = yield userModel_1.Player.updateOne({ username: data.playerId }, { $set: { status: data.status } });
                // Check if the update was successful using modifiedCount
                if (updateResult.modifiedCount === 0) {
                    console.warn(`No document modified for player: ${data.playerId}`);
                    if (callback)
                        callback({ success: false, message: "No changes made to status" });
                    return;
                }
                // Notify the player socket of the status change
                const playerSocket = sessionManager_1.sessionManager.getPlayerPlatform(data.playerId);
                if (playerSocket) {
                    if (data.status === "inactive") {
                        yield playerSocket.forceExit(false);
                        console.log(`Player ${data.playerId} exited from platform due to inactivity`);
                    }
                    else {
                        playerSocket.sendData({ type: "STATUS", data: { status: data.status } }, "platform");
                    }
                }
                if (callback)
                    callback({ success: true, message: "Status updated successfully" });
            }
            catch (error) {
                console.error("Error updating player status:", error);
                if (callback)
                    callback({ success: false, message: "Error updating status" });
            }
        });
    }
    playerSessionHandler(data, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Retrieve all platform session data for the player
                const platformSessions = yield sessionModel_1.PlatformSessionModel.find({ playerId: data.playerId }).lean();
                if (!platformSessions || platformSessions.length === 0) {
                    console.log("No session data found for player:", data.playerId);
                    if (callback)
                        callback({ success: false, message: "No session data found for this player" });
                    return;
                }
                // Return all session data to the client
                if (callback)
                    callback({ success: true, message: "All session data retrieved successfully", sessionData: platformSessions });
            }
            catch (error) {
                console.error("Error retrieving player session data:", error);
                if (callback)
                    callback({ success: false, message: "Error retrieving session data" });
            }
        });
    }
    sendMessage(data) {
        if (this.socketData.socket) {
            this.socketData.socket.emit("message", data);
        }
    }
    sendData(data) {
        if (this.socketData.socket) {
            this.socketData.socket.emit("data", data);
        }
    }
    sendAlert(data) {
        if (this.socketData.socket) {
            this.socketData.socket.emit("alert", data);
        }
    }
}
exports.default = Manager;
