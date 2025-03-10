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
exports.GameSession = void 0;
const uuid_1 = require("uuid");
const events_1 = require("events");
const gameModel_1 = require("../games/gameModel");
class GameSession extends events_1.EventEmitter {
    constructor(playerId, gameId, creditsAtEntry) {
        super();
        this.exitTime = null;
        this.creditsAtExit = 0;
        this.totalSpins = 0;
        this.totalBetAmount = 0;
        this.totalWinAmount = 0;
        this.spinData = [];
        this.sessionDuration = 0;
        this.playerId = playerId;
        this.gameId = gameId;
        this.sessionId = this.generateSessionId();
        this.entryTime = new Date();
        this.creditsAtEntry = creditsAtEntry;
        this.gameName = ""; // Initialize gameName
        this.initializeGameName();
    }
    initializeGameName() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.gameName = yield this.getGameNameByTagName(this.gameId);
            }
            catch (error) {
                console.error("Error fetching game name:", error);
                this.gameName = "Unknown Game";
            }
        });
    }
    generateSessionId() {
        return `${this.playerId}-${this.gameId}-${Date.now()}`;
    }
    createSpin() {
        const spinId = `${this.gameId}-${Date.now()}-${(0, uuid_1.v4)()}`;
        const newSpin = { spinId, betAmount: 0, winAmount: 0 };
        this.spinData.push(newSpin);
        this.totalSpins++;
        this.emit("spinCreated", newSpin);
        return spinId;
    }
    updateSpinField(spinId, field, value) {
        const spin = this.getSpinById(spinId);
        if (!spin)
            return false;
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
                    spin.specialFeatures = Object.assign(Object.assign({}, spin.specialFeatures), value);
                }
                break;
            default:
                spin[field] = value;
        }
        this.emit("spinUpdated", this.getSummary());
        return true;
    }
    endSession(creditsAtExit) {
        this.exitTime = new Date();
        this.creditsAtExit = creditsAtExit;
        this.sessionDuration = (this.exitTime.getTime() - this.entryTime.getTime()) / 1000;
        this.emit("sessionEnded", this.getSummary());
    }
    getSummary() {
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
    getSpinById(spinId) {
        return this.spinData.find((spin) => spin.spinId === spinId);
    }
    getGameNameByTagName(tagName) {
        return __awaiter(this, void 0, void 0, function* () {
            const platform = yield gameModel_1.Platform.aggregate([
                { $unwind: "$games" },
                { $match: { "games.tagName": tagName } },
                { $project: { _id: 0, gameName: "$games.name" } },
                { $limit: 1 }
            ]);
            if (platform.length === 0) {
                return null;
            }
            return platform[0].gameName;
        });
    }
}
exports.GameSession = GameSession;
