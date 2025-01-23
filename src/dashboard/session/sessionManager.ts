import Manager from "../../Manager";
import PlayerSocket from "../../Player";
import { eventType } from "../../utils/utils";
import { GameSession } from "./gameSession";
import { PlatformSessionModel } from "./sessionModel";


class SessionManager {
    private platformSessions: Map<string, PlayerSocket> = new Map();
    private currentActiveManagers: Map<string, Manager> = new Map();

    public async startPlatformSession(player: PlayerSocket) {
        this.platformSessions.set(player.playerData.username, player);
        try {
            const platformSessionData = new PlatformSessionModel(player.getSummary())
            await platformSessionData.save();

            const manager = this.getActiveManagerByUsername(player.managerName);
            if (manager) {
                manager.notifyManager({ type: eventType.ENTERED_PLATFORM, payload: player.getSummary() });
            }
        } catch (error) {
            console.error(`Failed to save platform session for player: ${player.playerData.username}`, error);
        } finally {
            console.log(`PLATFORM STARTED : `, player.playerData.username)
        }
    }

    public async endPlatformSession(playerId: string) {
        try {
            const platformSession = this.getPlayerPlatform(playerId)
            if (platformSession) {
                platformSession.setExitTime();
                this.platformSessions.delete(playerId);

                const currentManager = this.getActiveManagerByUsername(platformSession.managerName)
                if (currentManager) {
                    currentManager.notifyManager({ type: eventType.EXITED_PLATFORM, payload: platformSession.getSummary() })
                }

                await PlatformSessionModel.updateOne(
                    { playerId: playerId, entryTime: platformSession.entryTime },
                    { $set: { exitTime: platformSession.exitTime } }
                )
            }
        } catch (error) {
            console.error(`Failed to save platform session for player: ${playerId}`, error);
        }

    }

    public async startGameSession(playerId: string, gameId: string, credits: number) {
        const platformSession = this.getPlayerPlatform(playerId);
        if (platformSession) {
            platformSession.currentGameSession = new GameSession(playerId, gameId, credits);

            platformSession.currentGameSession.on("spinUpdated", (summary) => {
                const currentManager = this.getActiveManagerByUsername(platformSession.managerName);
                if (currentManager) {
                    currentManager.notifyManager({ type: eventType.UPDATED_SPIN, payload: summary })
                }
            });

            platformSession.currentGameSession.on("sessionEnded", (summary) => {
                const currentManager = this.getActiveManagerByUsername(platformSession.managerName);
                if (currentManager) {
                    currentManager.notifyManager({ type: eventType.EXITED_GAME, payload: summary })
                }
            });

            const gameSummary = platformSession.currentGameSession?.getSummary();

            if (gameSummary) {
                const currentManager = this.getActiveManagerByUsername(platformSession.managerName)
                if (currentManager) {
                    currentManager.notifyManager({ type: eventType.ENTERED_GAME, payload: gameSummary });
                }
            } else {
                console.error(`No active platform session found for player: ${playerId}`);
            }
        } else {
            console.error(`No active platform session found for player: ${playerId}`);
        }
    }

    public async endGameSession(playerId: string, credits: number) {
        try {
            const platformSession = this.getPlayerPlatform(playerId);
            if (platformSession && platformSession.currentGameSession) {
                // End and delete the current game session
                platformSession.currentGameSession.endSession(platformSession.playerData.credits);
                const gameSessionData = platformSession.currentGameSession.getSummary();

                await PlatformSessionModel.updateOne(
                    { playerId: playerId, entryTime: platformSession.entryTime },
                    { $push: { gameSessions: gameSessionData }, $set: { currentRTP: platformSession.currentRTP } }
                );

                platformSession.currentGameSession = null;
                console.log(`Current game session deleted for player: ${playerId}`);
            }
        } catch (error) {
            console.error(`Failed to delete the current game session for player: ${playerId}`, error);
        }

    }


    public getPlatformSessions(): Map<string, PlayerSocket> {
        return this.platformSessions;
    }

    public getPlayerPlatform(username: string): PlayerSocket | null {
        if (this.platformSessions.has(username)) {
            return this.platformSessions.get(username) || null
        }
        return null
    }

    public getPlayerCurrentGameSession(username: string) {
        return this.getPlayerPlatform(username)?.currentGameSession;
    }

    public addManager(username: string, manager: Manager): void {
        if (this.currentActiveManagers.has(username)) {
            console.warn(`Manager with username "${username}" already exists in currentActiveManagers.`);
        } else {
            this.currentActiveManagers.set(username, manager);
            console.log(`Manager with username "${username}" has been added to currentActiveManagers.`);
        }
    }

    public getActiveManagers(): Map<string, Manager> {
        return this.currentActiveManagers;
    }

    public getActiveManagerByUsername(username: string): Manager | null {
        if (this.currentActiveManagers.has(username)) {
            return this.currentActiveManagers.get(username) || null
        }
        return null;
    }

    public deleteManagerByUsername(username: string): void {
        if (this.currentActiveManagers.has(username)) {
            this.currentActiveManagers.delete(username);
            console.log(`Manager with username "${username}" has been removed from currentActiveManagers.`);
        } else {
            console.warn(`Manager with username "${username}" not found in currentActiveManagers.`);
        }
    }

}

export const sessionManager = new SessionManager();