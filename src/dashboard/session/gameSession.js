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
const events_2 = require("../../utils/events");
const redis_1 = require("../../config/redis");
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
        return __awaiter(this, void 0, void 0, function* () {
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
            // 🔄 Update Redis with the latest game session state
            yield redis_1.redisClient.pubClient.hSet(events_2.Channels.PLAYGROUND(this.playerId), {
                "currentGame": JSON.stringify(this.getSummary())
            });
            this.emit(events_2.Events.PLAYGROUND_GAME_SPIN, this.getSummary());
            return true;
        });
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
}
exports.GameSession = GameSession;
