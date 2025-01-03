import { v4 as uuidv4 } from "uuid";
import { EventEmitter } from "events";
import { ISpecialFeatures, ISpinData } from "./sessionTypes";
import mongoose from "mongoose";
import { Platform } from "../games/gameModel";

export class GameSession extends EventEmitter {
    playerId: string;
    gameId: string;
    gameName: string;
    sessionId: string;
    entryTime: Date;
    exitTime: Date | null = null;
    creditsAtEntry: number;
    creditsAtExit: number = 0;
    totalSpins: number = 0;
    totalBetAmount: number = 0;
    totalWinAmount: number = 0;
    spinData: ISpinData[] = [];
    sessionDuration: number = 0;


    constructor(playerId: string, gameId: string, creditsAtEntry: number) {
        super();
        this.playerId = playerId;
        this.gameId = gameId;
        this.sessionId = this.generateSessionId();
        this.entryTime = new Date();
        this.creditsAtEntry = creditsAtEntry;
        this.gameName = ""; // Initialize gameName
        this.initializeGameName();
    }

    private async initializeGameName() {
        try {
            this.gameName = await this.getGameNameByTagName(this.gameId);
        } catch (error) {
            console.error("Error fetching game name:", error);
            this.gameName = "Unknown Game";
        }
    }

    private generateSessionId(): string {
        return `${this.playerId}-${this.gameId}-${Date.now()}`;
    }

    public createSpin(): string {
        const spinId = `${this.gameId}-${Date.now()}-${uuidv4()}`;
        const newSpin: ISpinData = { spinId, betAmount: 0, winAmount: 0 };
        this.spinData.push(newSpin);
        this.totalSpins++;

        this.emit("spinCreated", newSpin);
        return spinId;
    }

    public updateSpinField<T extends keyof ISpinData>(spinId: string, field: T, value: ISpinData[T]): boolean {
        const spin = this.getSpinById(spinId);
        if (!spin) return false;

        switch (field) {
            case "betAmount":
                if (typeof value === "number") {
                    spin.betAmount = value;
                    this.totalBetAmount += value;
                }
                break;

            case "winAmount":
                if (typeof value === "number") {
                    spin.winAmount = value;
                    this.totalWinAmount += value;
                }
                break;

            case "specialFeatures":
                if (typeof value === "object") {
                    spin.specialFeatures = {
                        ...spin.specialFeatures,
                        ...(value as ISpecialFeatures),
                    };
                }
                break;

            default:
                spin[field] = value;
        }

        this.emit("spinUpdated", this.getSummary());
        return true;
    }

    public endSession(creditsAtExit: number) {
        this.exitTime = new Date();
        this.creditsAtExit = creditsAtExit;
        this.sessionDuration = (this.exitTime.getTime() - this.entryTime.getTime()) / 1000;

        this.emit("sessionEnded", this.getSummary());
    }

    public getSummary() {
        return {
            playerId: this.playerId,
            gameId: this.gameId,
            gameName: this.gameName,
            sessionId: this.sessionId,
            entryTime: this.entryTime,
            exitTime: this.exitTime,
            creditsAtEntry: this.creditsAtEntry,
            creditsAtExit: this.creditsAtExit,
            totalSpins: this.totalSpins,
            totalBetAmount: this.totalBetAmount,
            totalWinAmount: this.totalWinAmount,
            spinData: this.spinData,
            sessionDuration: this.sessionDuration,
        };
    }

    private getSpinById(spinId: string): ISpinData | undefined {
        return this.spinData.find((spin) => spin.spinId === spinId);
    }

    async getGameNameByTagName(tagName: string): Promise<string | null> {
        const platform = await Platform.aggregate([
            { $unwind: "$games" },
            { $match: { "games.tagName": tagName } },
            { $project: { _id: 0, gameName: "$games.name" } },
            { $limit: 1 }
        ]);

        if (platform.length === 0) {
            return null;
        }

        return platform[0].gameName;
    }
}