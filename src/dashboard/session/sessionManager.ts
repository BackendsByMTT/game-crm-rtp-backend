import { redisClient } from "../../config/redis";
import Manager from "../../Manager";
import PlayerSocket from "../../Player";
import { Player, User } from "../users/userModel";
import { GameSession } from "./gameSession";
import { PlatformSessionModel } from "./sessionModel";
import { Channels, Events } from "../../utils/events";
import { Socket } from "socket.io";
import { IUser } from "../users/userType";
import { Platform } from "../games/gameModel";
import { v4 as uuidv4 } from "uuid";


const SESSION_EXPIRATION_TIME = 3600; // 1 hour in seconds

class SessionManager {

    private playground: Map<string, PlayerSocket> = new Map();
    private control: Map<string, Manager> = new Map();

    constructor() {
        // Start periodic cleanup of stale sessions
        setInterval(this.cleanupStaleSessions, SESSION_EXPIRATION_TIME * 1000);
    }

    private getPlayerDetails = async (username: string) => {
        const player = await Player.findOne({ username }).populate<{ createdBy: IUser }>("createdBy", "username");
        if (player) {
            return {
                credits: player.credits,
                status: player.status,
                managerName: player.createdBy?.username || null
            };
        }
        throw new Error("Player not found");
    };

    private getManagerDetails = async (username: string) => {
        const manager = await User.findOne({ username });
        if (manager) {
            return { credits: manager.credits, status: manager.status };
        }
        throw new Error("Manager not found");
    }

    private async getGameNameByTagName(tagName: string): Promise<string> {
        try {
            const platform = await Platform.aggregate([
                { $unwind: "$games" },
                { $match: { "games.tagName": tagName } },
                { $project: { _id: 0, gameName: "$games.name" } },
                { $limit: 1 }
            ]);

            if (platform.length === 0) {
                return "Unknown Game"; // Default if not found
            }

            return platform[0].gameName;
        } catch (error) {
            console.error(`❌ Error fetching game name for tag: ${tagName}`, error);
            return "Unknown Game";
        }
    }

    // PLAYGROUND
    public startSession = async (username: string, role: string, userAgent: string, socket: Socket) => {
        try {
            const sessionId = uuidv4();

            // 🚀 Get player details
            const playerDetails = await this.getPlayerDetails(username);
            if (!playerDetails) {
                socket.emit("error", "Player not found");
                socket.disconnect();
                return;
            }

            // ⚠️ Prevent duplicate sessions
            if (this.playground.has(username)) {
                socket.emit("error", "Player session already exists");

                return;
            }

            // ✅ Create Player Instance
            const player = new PlayerSocket(username, role, playerDetails.status, playerDetails.credits, userAgent, socket, playerDetails.managerName);
            player.sessionId = sessionId; // Store it inside PlayerSocket
            this.playground.set(username, player);


            // 📌 Store in Redis
            const sessionData = player.getSummary();
            await redisClient.pubClient.hSet(Channels.PLAYGROUND(username), {
                "sessionId": sessionId,
                "playerId": sessionData.playerId,
                "status": sessionData.status,
                "initialCredits": sessionData.initialCredits?.toString() || "0",
                "currentCredits": sessionData.currentCredits?.toString() || "0",
                "managerName": sessionData.managerName || "",
                "entryTime": sessionData.entryTime.toISOString(),
                "exitTime": sessionData.exitTime ? sessionData.exitTime.toISOString() : "null",
                "currentRTP": sessionData.currentRTP?.toString() || "0",
                "currentGame": sessionData.currentGame ? JSON.stringify(sessionData.currentGame) : "null",
                "userAgent": sessionData.userAgent || "",
                "platformId": sessionData.platformId?.toString() || "",
            });
            await redisClient.pubClient.expire(Channels.PLAYGROUND(username), SESSION_EXPIRATION_TIME);

            // 📌 Save in MongoDB
            await new PlatformSessionModel(sessionData).save();

            // 🔔 Notify & Start Heartbeat
            await this.notify(username, Events.PLAYGROUND_ENTER, sessionData);
            this.startSessionHeartbeat(player);

            console.log(`✅ Playground session stored for ${username}`);
        } catch (error) {
            console.error(`Failed to start playground session for player: ${username}`, error);
        }
    }

    public async restoreSessionFromRedis(sessionData: any, socket: Socket): Promise<PlayerSocket | null> {
        try {
            console.log(`🔄 Restoring session from Redis for ${sessionData.playerId}`);

            // ✅ Properly reconstruct the PlayerSocket object
            const player = new PlayerSocket(
                sessionData.playerId,
                sessionData.role,
                sessionData.status,
                parseFloat(sessionData.currentCredits),
                sessionData.userAgent,
                socket,
                sessionData.managerName
            );

            player.entryTime = new Date(sessionData.entryTime);
            player.exitTime = sessionData.exitTime !== "null" ? new Date(sessionData.exitTime) : null;
            player.currentRTP = parseFloat(sessionData.currentRTP);
            player.platformData.platformId = sessionData.platformId;
            player.sessionId = sessionData.sessionId || uuidv4(); // Use existing or fallback

            // ✅ Store restored player in memory
            this.playground.set(sessionData.playerId, player);

            // ✅ Ensure socket events are re-initialized
            player.initializePlatformSocket(socket);

            // ✅ Re-subscribe to Redis events
            player.subscribeToRedisEvents();

            // ✅ Restart heartbeat
            this.startSessionHeartbeat(player);

            await this.notify(sessionData.playerId, Events.PLAYGROUND_GAME_ENTER, player.currentGameSession.getSummary());


            console.log(`✅ Successfully restored session for ${sessionData.playerId}`);
            return player;
        } catch (error) {
            console.error(`❌ Failed to restore session for ${sessionData.playerId}:`, error);
            return null;
        }
    }

    public endSession = async (username: string) => {
        try {
            const player = this.playground.get(username);
            if (!player) {
                console.warn(`⚠️ No active session found for ${username}`);
                return;
            }

            // ❌ Stop Heartbeat
            this.stopSessionHeartbeat(player);

            // ❌ Remove from in-memory session
            this.playground.delete(username);

            // ❌ Remove from Redis
            await redisClient.pubClient.del(Channels.PLAYGROUND(username));

            // ❌ Notify control users about removal
            await this.notify(username, Events.PLAYGROUND_EXIT, player.getSummary());


            // ❌ Update MongoDB
            await PlatformSessionModel.updateOne(
                { playerId: player.playerData.username, sessionId: player.sessionId },
                { $set: { exitTime: new Date() } }
            );
            console.log(`✅ Playground session ended for ${username}`);

        } catch (error) {
            console.error(`Failed to delete playground session for player: ${username}`, error);
        }
    }

    public startSessionHeartbeat = (player: PlayerSocket) => {
        if (!player || !player.platformData.socket) return;

        // ✅ Stop any existing heartbeat before starting a new one
        this.stopSessionHeartbeat(player);

        // ✅ Start a new heartbeat interval
        player.platformData.heartbeatInterval = setInterval(async () => {
            if (!player.platformData.socket || !player.platformData.socket.connected) {
                this.stopSessionHeartbeat(player);
                return;
            }
            // ✅ Sync credit balance with Redis
            await redisClient.pubClient.hSet(Channels.PLAYGROUND(player.playerData.username), {
                "currentCredits": player.playerData.credits.toString()
            });

            // ✅ Send updated balance to the client
            player.sendData(
                { type: Events.PLAYGROUND_CREDITS, payload: { credits: player.playerData.credits } },
                "platform"
            );

            // Send a ping to the client
            player.platformData.socket.emit('ping');


        }, 5000); // Update every 5 seconds
    };

    private stopSessionHeartbeat = (player: PlayerSocket) => {
        if (player.platformData.heartbeatInterval) {
            clearInterval(player.platformData.heartbeatInterval);
            player.platformData.heartbeatInterval = null;
            console.log(`💔 Stopped heartbeat for ${player.playerData.username}`);
        }
    };

    private async cleanupStaleSessions() {
        try {
            const keys = await redisClient.pubClient.keys(`${Channels.PLAYGROUND('*')}`);
            for (const key of keys) {
                const ttl = await redisClient.pubClient.ttl(key);

                if (ttl === -2) { // Key does not exist
                    const username = key.split(':')[1];

                    // 🔍 Ensure the player is truly inactive before removing
                    if (this.playground.has(username)) {
                        console.warn(`⚠️ Prevented premature cleanup for active player: ${username}`);
                        continue;
                    }

                    this.playground.delete(username);
                    console.log(`🧹 Cleaned up stale session for ${username}`);
                }
            }
        } catch (error) {
            console.error("Error cleaning up stale sessions:", error);
        }
    }


    // GAME
    public startGame = async (username: string, gameId: string, socket: Socket) => {
        try {
            console.log(`🎰 Player ${username} entering game: ${gameId}`);

            const player = this.playground.get(username);
            if (!player) {
                console.warn(`⚠️ No active session found for ${username}`);
                return;
            }

            if (player.currentGameSession) {
                console.warn(`⚠️ Player ${username} already in game: ${player.currentGameSession.gameId}`);
                return;
            }

            const gameName = await this.getGameNameByTagName(gameId);

            // ✅ Create and assign the game session
            player.currentGameSession = new GameSession(username, gameId, player.playerData.credits);
            player.currentGameSession.gameName = gameName;

            console.log(`✅ Created game session for ${username}: ${gameId} (${gameName})`);


            // ✅ Initialize the game socket
            player.updateGameSocket(socket);

            player.currentGameSession.on(Events.PLAYGROUND_GAME_SPIN, async (summary) => {
                await this.notify(player.playerData.username, Events.PLAYGROUND_GAME_SPIN, summary);
            });

            // ✅ Store the game session in Redis
            console.log("SYMNMN : ", player.currentGameSession.getSummary())

            await redisClient.pubClient.hSet(Channels.PLAYGROUND(username), {
                "currentGame": JSON.stringify(player.currentGameSession.getSummary())
            });

            await this.notify(username, Events.PLAYGROUND_GAME_ENTER, player.currentGameSession.getSummary());
            console.log(`✅ Game session started for ${username}: ${gameId} (${player.currentGameSession.gameName})`);

        } catch (error) {
            console.error(`❌ Failed to start game session for ${username}:`, error);
        }
    }

    public endGame = async (username: string) => {
        try {
            console.log(`🔍 Checking endGame() call for ${username}`);


            const player = this.playground.get(username);
            if (!player || !player.currentGameSession) {
                console.warn(`⚠️ No active game session found for ${username}`);
                return;
            }

            console.log(`🚨 Ending game for ${username}: ${player.currentGameSession.gameId}`);

            // 🛑 Ensure game session data is valid before updating DB
            if (player.currentGameSession) {
                player.currentGameSession.exitTime = new Date();
                player.currentGameSession.creditsAtExit = player.playerData.credits;
                player.currentGameSession.sessionDuration = Math.abs(
                    player.currentGameSession.exitTime.getTime() - player.currentGameSession.entryTime.getTime()
                );

                // 🗑️ Remove from Redis
                await redisClient.pubClient.hDel(Channels.PLAYGROUND(username), "currentGame");

                // 📝 Store game session in MongoDB
                await PlatformSessionModel.updateOne(
                    { playerId: player.playerData.username, sessionId: player.sessionId },
                    {
                        $push: { gameSessions: player.currentGameSession.getSummary() },
                        $set: { currentRTP: player.currentRTP }
                    }
                );
            }

            // 🧹 Clear `currentGameData`
            player.currentGameData = {
                username: player.playerData.username,
                gameId: null,
                gameSettings: null,
                currentGameManager: null,
                session: null,
                socket: null,
                heartbeatInterval: setInterval(() => { }, 0),

                sendMessage: player.sendMessage.bind(player),
                sendError: player.sendError.bind(player),
                sendAlert: player.sendAlert.bind(player),
                updatePlayerBalance: player.updatePlayerBalance.bind(player),
                deductPlayerBalance: player.deductPlayerBalance.bind(player),
                getPlayerData: () => player.playerData,
            };

            // 🔄 Reset current game session
            player.currentGameSession = null;

            await this.notify(player.playerData.username, Events.PLAYGROUND_GAME_EXIT, username);
            console.log(`✅ Successfully ended game session for ${username}`);

        } catch (error) {
            console.error(`❌ Failed to end game session for player: ${username}`, error);
        }
    };


    // CONTROL
    public addControlUser = async (username: string, role: string, socket: Socket) => {
        try {
            const managerDetails = await this.getManagerDetails(username);
            // Prevent duplicate sessions
            if (this.control.has(username)) {
                socket.emit("error", "Control session already exists.");
                socket.disconnect();
                return;
            }

            // Create Manager Instance
            const manager = new Manager(username, managerDetails.credits, role, socket.handshake.headers["user-agent"], socket);
            this.control.set(username, manager);

            // Update Redis
            await redisClient.pubClient.hSet(Channels.CONTROL(role, username), {
                username,
                role,
                credits: manager.credits.toString()
            });

            console.log(`✅ Control session stored for ${username}`);
        } catch (error) {
            console.error(`❌ Failed to add control user:`, error);
        }
    }

    public removeControlUser = async (username: string, role: string) => {
        try {
            const manager = this.control.get(username);
            if (manager) {
                // ❌ Stop heartbeat before removing session
                this.stopControlHeartbeat(manager);
            }

            this.control.delete(username);
            await redisClient.pubClient.del(Channels.CONTROL(role, username));

            console.log(`✅ Control session deleted for ${username}`);
        } catch (error) {
            console.error(`❌ Failed to delete control session for ${username}`, error);
        }
    };

    public async restoreControlUserFromRedis(sessionData: any, socket: Socket): Promise<Manager | null> {
        try {
            console.log(`🔄 Restoring manager session from Redis for ${sessionData.username}`);

            // ✅ Properly reconstruct the Manager object
            const manager = new Manager(
                sessionData.username,
                parseFloat(sessionData.credits),
                sessionData.role,
                sessionData.userAgent,
                socket
            );

            // ✅ Store the restored manager in memory
            this.control.set(sessionData.username, manager);

            // ✅ Re-subscribe to Redis events
            manager.subscribeToRedisEvents();

            // ✅ Restart heartbeat
            this.startControlHeartbeat(manager);

            console.log(`✅ Successfully restored manager session for ${sessionData.username}`);
            return manager;
        } catch (error) {
            console.error(`❌ Failed to restore control session for ${sessionData.username}:`, error);
            return null;
        }
    }

    public startControlHeartbeat = (manager: Manager) => {
        if (!manager || !manager.socketData.socket) return;

        // ✅ Stop any existing heartbeat before starting a new one
        this.stopControlHeartbeat(manager);

        // ✅ Start a new heartbeat interval
        manager.socketData.heartbeatInterval = setInterval(async () => {
            if (!manager.socketData.socket || !manager.socketData.socket.connected) {
                this.stopControlHeartbeat(manager);
                return;
            }

            // Send control session updates
            manager.sendData({
                type: Events.CONTROL_CREDITS,
                payload: { credits: manager.credits, role: manager.role, worker: process.pid }
            });

            // Send all active players data
            const allPlayers = await manager.handleGetAllPlayers();
            manager.sendData({ type: Events.PLAYGROUND_ALL, payload: allPlayers });

        }, 5000); // Update every 5 seconds
    };

    public stopControlHeartbeat = (manager: Manager) => {
        if (manager.socketData.heartbeatInterval) {
            clearInterval(manager.socketData.heartbeatInterval);
            manager.socketData.heartbeatInterval = null;
        }
    };



    // HELPER
    private notify = async (username: string, event: Events, payload: any) => {
        try {
            const hierarchyUsers = await Player.getHierarchyUsers(username);

            for (const manager of hierarchyUsers) {
                const channel = `control:${manager.role}:${manager.username}`;
                await redisClient.pubClient.publish(channel, JSON.stringify({ type: event, payload }));
                console.log(`📢 Published event to ${channel}:`, { type: event, payload });
            }

        } catch (error) {
            console.error("❌ Failed to publish notifications to Redis:", error);
        }
    }

    public getControlUser = (username: string): Manager | null => {
        return this.control.get(username) || null;
    }

    public getPlaygroundUser = (username: string): PlayerSocket | null => {
        return this.playground.get(username) || null;
    }

}

export const sessionManager = new SessionManager();
