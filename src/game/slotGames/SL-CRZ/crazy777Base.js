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
exports.SLCRZ = void 0;
const RandomResultGenerator_1 = require("../RandomResultGenerator");
const types_1 = require("./types");
const helper_1 = require("./helper");
const sessionManager_1 = require("../../../dashboard/session/sessionManager");
class SLCRZ {
    constructor(currentGameData) {
        this.currentGameData = currentGameData;
        this.playerData = {
            haveWon: 0,
            currentWining: 0,
            totalbet: 0,
            rtpSpinCount: 0,
            totalSpin: 0,
            currentPayout: 0
        };
        this.settings = (0, helper_1.initializeGameSettings)(currentGameData, this);
        (0, helper_1.generateInitialReel)(this.settings);
        (0, helper_1.sendInitData)(this);
    }
    get initSymbols() {
        const Symbols = [];
        this.currentGameData.gameSettings.Symbols.forEach((Element) => {
            Symbols.push(Element);
        });
        return Symbols;
        ``;
    }
    sendMessage(action, message) {
        this.currentGameData.sendMessage(action, message, true);
    }
    sendError(message) {
        this.currentGameData.sendError(message, true);
    }
    sendAlert(message) {
        this.currentGameData.sendAlert(message, true);
    }
    updatePlayerBalance(amount) {
        this.currentGameData.updatePlayerBalance(amount);
    }
    deductPlayerBalance(amount) {
        this.currentGameData.deductPlayerBalance(amount);
    }
    getPlayerData() {
        return this.currentGameData.getPlayerData();
    }
    messageHandler(response) {
        switch (response.id) {
            case "SPIN":
                this.prepareSpin(response.data);
                this.getRTP(response.data.spins || 1);
                break;
        }
    }
    prepareSpin(data) {
        this.settings.currentLines = data.currentLines;
        this.settings.BetPerLines = this.settings.currentGamedata.bets[data.currentBet];
        this.settings.currentBet = this.settings.BetPerLines * this.settings.currentLines;
    }
    spinResult() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const playerData = this.getPlayerData();
                const platformSession = sessionManager_1.sessionManager.getPlayerPlatform(playerData.username);
                if (this.settings.currentBet > playerData.credits) {
                    this.sendError("Low Balance");
                    return;
                }
                if (!this.settings.isFreeSpin) {
                    yield this.deductPlayerBalance(this.settings.currentBet * 3);
                    this.playerData.totalbet += this.settings.currentBet * 3;
                }
                if (this.settings.freeSpinCount == 0) {
                    this.settings.isFreeSpin = false;
                }
                if (this.settings.isFreeSpin &&
                    this.settings.freeSpinCount > 0) {
                    this.settings.freeSpinCount--;
                    // this.settings.currentBet = 0;
                    console.log(this.settings.freeSpinCount, "this.settings.freeSpinCount");
                    this.updatePlayerBalance(this.playerData.currentWining);
                    // makeResultJson(this)
                }
                const spinId = platformSession.currentGameSession.createSpin();
                platformSession.currentGameSession.updateSpinField(spinId, 'betAmount', this.settings.currentBet);
                new RandomResultGenerator_1.RandomResultGenerator(this);
                this.checkResult();
                const winAmount = this.playerData.currentWining;
                platformSession.currentGameSession.updateSpinField(spinId, 'winAmount', winAmount);
            }
            catch (error) {
                this.sendError("Spin error");
                console.error("Failed to generate spin results:", error);
            }
        });
    }
    getRTP(spins) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let spend = 0;
                let won = 0;
                this.playerData.rtpSpinCount = spins;
                for (let i = 0; i < this.playerData.rtpSpinCount; i++) {
                    yield this.spinResult();
                    spend = this.playerData.totalbet;
                    won = this.playerData.haveWon;
                    console.log(`Spin ${i + 1} completed. ${this.playerData.totalbet} , ${won}`);
                }
                let rtp = 0;
                if (spend > 0) {
                    rtp = won / spend;
                }
                console.log("Total Spent", spend);
                console.log("Total Won", won);
                console.log('RTP calculated:', rtp * 100);
                return;
            }
            catch (error) {
                console.error("Failed to calculate RTP:", error);
                this.sendError("RTP calculation error");
            }
        });
    }
    checkResult() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resultmatrix = this.settings.resultSymbolMatrix;
                const checkMatrix = resultmatrix.map(row => row.slice(0, 3));
                const specialMatrix = resultmatrix.map(row => row[3]);
                console.log("Result Matrix:", resultmatrix);
                const middleRow = checkMatrix[1];
                const extrasymbol = specialMatrix[1];
                console.log("Middle row:", middleRow);
                console.log("Special element:", extrasymbol);
                console.log('freeSpins', this.settings.freeSpinCount);
                if (middleRow.includes(0)) {
                    this.playerData.currentWining = 0;
                    (0, helper_1.makeResultJson)(this);
                    this.updatePlayerBalance(this.playerData.currentWining);
                    console.log("No win: '0' present in the middle row.");
                    return;
                }
                const isWinning = yield (0, helper_1.checkWinningCondition)(this, middleRow);
                let payout = 0;
                switch (isWinning.winType) {
                    case types_1.WINNINGTYPE.REGULAR:
                        console.log("Regular Win! Calculating payout...");
                        payout = yield (0, helper_1.calculatePayout)(this, middleRow, isWinning.symbolId, types_1.WINNINGTYPE.REGULAR);
                        console.log("Payout:", payout);
                        break;
                    case types_1.WINNINGTYPE.MIXED:
                        console.log("Mixed Win! Calculating mixed payout...");
                        payout = yield (0, helper_1.calculatePayout)(this, middleRow, isWinning.symbolId, types_1.WINNINGTYPE.MIXED);
                        console.log("Mixed Payout:", payout);
                        break;
                    default:
                        console.log("No specific win condition met. Applying default payout.");
                        payout = this.settings.defaultPayout * this.settings.BetPerLines;
                        this.playerData.currentWining = payout;
                        console.log("Default Payout:", payout);
                        break;
                }
                if (payout > 0 && !this.settings.isFreeSpin) {
                    payout = yield (0, helper_1.applyExtraSymbolEffect)(this, payout, extrasymbol);
                    this.playerData.currentWining = payout;
                    this.playerData.haveWon += this.playerData.currentWining;
                    this.updatePlayerBalance(this.playerData.currentWining);
                    (0, helper_1.makeResultJson)(this);
                    return;
                }
                this.playerData.haveWon += this.playerData.currentWining;
                (0, helper_1.makeResultJson)(this);
                console.log("Total Payout for:", this.getPlayerData().username, "" + payout);
                console.log("Total Free Spins Remaining:", this.settings.freeSpinCount);
            }
            catch (error) {
                console.error("Error in checkResult:", error);
            }
        });
    }
}
exports.SLCRZ = SLCRZ;
