import { redisClient } from "../../config/redis";
import Manager from "../../Manager";
import PlayerSocket from "../../Player";
import { Player, User } from "../users/userModel";
import { IUser } from "../users/userType";
import { GameSession } from "./gameSession";
import { PlatformSessionModel } from "./sessionModel";
import { NewEventType } from "../../utils/eventTypes";


class SessionManager {

    private playground: Map<string, PlayerSocket> = new Map();
    private control: Map<string, Manager> = new Map();

    public async startSession(player: PlayerSocket) {
        try {
            const sessionData = player.getSummary();

            this.playground.set(player.playerData.username, player);

            await redisClient.pubClient.hSet(
                `playground:${player.playerData.username}`,
                {
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
                }
            );
            const playgroundSessionData = new PlatformSessionModel(sessionData);
            await playgroundSessionData.save();

            await this.notify(player.playerData.username, NewEventType.PLAYGROUND_JOINED, sessionData);
            this.sessionHeartbeat(player);

            console.log(`✅ Playground session stored in Redis & memory for ${player.playerData.username}`);
        } catch (error) {
            console.error(`Failed to save playground session for player: ${player.playerData.username}`, error);
        }
    }

    // TODO: Need to fix why it disconnects automatically when joined
    public async endSession(player: PlayerSocket) {
        try {
            this.playground.delete(player.playerData.username);
            await redisClient.pubClient.del(`playground:${player.playerData.username}`);
            await this.notify(player.playerData.username, NewEventType.PLAYGROUND_EXITED, player.getSummary());
            await PlatformSessionModel.updateOne(
                { playerId: player.playerData.username, entryTime: player.entryTime },
                { $set: { exitTime: new Date() } }
            )

        } catch (error) {
            console.error(`Failed to delete playground session for player: ${player.playerData.username}`, error);
        }
    }

    public async startGame(player: PlayerSocket) {
        try {
            player.currentGameSession = new GameSession(player.playerData.username, player.currentGameData.gameId, player.playerData.credits);

            player.currentGameSession.on(NewEventType.UPDATE_SPIN, async (summary) => {
                await this.notify(player.playerData.username, NewEventType.UPDATE_SPIN, summary);
            });

            const gameSummary = player.currentGameSession?.getSummary();
            await redisClient.pubClient.hSet(
                `playground:${player.playerData.username}`,
                { "currentGame": JSON.stringify(gameSummary) }
            )

            await this.notify(player.playerData.username, NewEventType.GAME_STARTED, gameSummary);
        } catch (error) {
            console.error(`Failed to start game session for player: ${player.playerData.username}`, error);
        }
    }

    public async endGame(player: PlayerSocket) {
        try {
            console.log(`🎮 ENDING GAME SESSION FOR ${player.playerData.username}`);
            if (!player.currentGameSession) {
                console.warn(`⚠️ No active game session found for ${player.playerData.username}`);
                return;
            }

            const gameSummary = player.currentGameSession.getSummary();
            console.log(`GAME SUMMARY FOR ${player.playerData.username}:`, gameSummary);

            player.currentGameSession.exitTime = new Date();
            player.currentGameSession.creditsAtExit = player.playerData.credits;
            player.currentGameSession.sessionDuration = Math.abs(player.currentGameSession.exitTime.getTime() - player.currentGameSession.entryTime.getTime());
            player.currentGameSession = null;
            player.currentGameData.session = null;

            if (player.currentGameData.socket) {
                console.log(`Disconnecting game socket for ${player.playerData.username}`);
                player.currentGameData.socket.disconnect();
                player.currentGameData.socket = null;
            }

            if (player.currentGameData.heartbeatInterval) {
                clearInterval(player.currentGameData.heartbeatInterval);
                console.log(`💓 Cleared game heartbeat for ${player.playerData.username}`);
            }

            await redisClient.pubClient.hDel(`playground:${player.playerData.username}`, "currentGame");

            await PlatformSessionModel.updateOne(
                { playerId: player.playerData.username, entryTime: player.entryTime },
                { $push: { gameSessions: gameSummary }, $set: { currentRTP: player.currentRTP } }
            )

            await this.notify(player.playerData.username, NewEventType.GAME_ENDED, gameSummary);
            console.log(`✅ Successfully ended game session for ${player.playerData.username}`);

        } catch (error) {
            console.error(`❌ Failed to end game session for player: ${player.playerData.username}`, error);
        }
    }

    public async getPlaygroundSession(username: string): Promise<PlayerSocket | null> {
        if (this.playground.has(username)) {
            return this.playground.get(username) || null;
        }
        return null;
    }

    private async notify(username: string, eventType: NewEventType, payload: any) {
        try {
            const hierarchyUsers = await Player.getHierarchyUsers(username);

            for (const manager of hierarchyUsers) {
                const channel = `control:${manager.role}:${manager.username}`;
                await redisClient.pubClient.publish(channel, JSON.stringify({ type: eventType, payload }));
                console.log(`📢 Published event to ${channel}:`, { type: eventType, payload });
            }

        } catch (error) {
            console.error("❌ Failed to publish notifications to Redis:", error);
        }
    }

    private async sessionHeartbeat(player: PlayerSocket) {
        if (!player || !player.platformData.socket) return;

        player.sendData({ type: "CREDIT", data: { credits: player.playerData.credits } }, "platform");

        player.platformData.heartbeatInterval = setInterval(() => {
            if (!player.platformData.socket || !player.platformData.socket.connected) {
                clearInterval(player.platformData.heartbeatInterval);
                console.log(`💔 Stopped heartbeat for ${player.playerData.username}`);
                return;
            }

            player.sendData({ type: "CREDIT", data: { credits: player.playerData.credits, worker: process.pid } }, "platform");
        }, 5000); // Update every 5 seconds
    }

    public async addControlUser(user: Manager) {
        try {
            this.control.set(user.username, user);
            await redisClient.pubClient.hSet(
                `control:${user.role}:${user.username}`,
                {
                    "username": user.username,
                    "role": user.role,
                    "credits": user.credits.toString(),
                    "userAgent": user.userAgent || "",
                }
            );
            console.log(`✅ Control session stored in Redis & memory for ${user.username}`);
        } catch (error) {
            console.error(`❌ Failed to save control session for user: ${user.username}`, error);
        }
    }

    public async removeControlUser(username: string) {
        try {
            this.control.delete(username);
            await redisClient.pubClient.del(`control:${username}`);
            console.log(`✅ Control session deleted from Redis & memory for ${username}`);
        } catch (error) {
            console.error(`❌ Failed to delete control session for user: ${username}`, error);
        }
    }


    public async getPlayerCurrentGameSession(username: string) {
        const playerSession = await this.getPlaygroundSession(username);
        return playerSession?.currentGameSession || null;
    }

}

export const sessionManager = new SessionManager();
