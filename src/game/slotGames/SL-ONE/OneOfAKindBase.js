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
exports.SLONE = void 0;
const sessionManager_1 = require("../../../dashboard/session/sessionManager");
const helper_1 = require("./helper");
class SLONE {
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
                //TODO:
                const playerData = this.settings._winData.slotGame.getPlayerData();
                const platformSession = sessionManager_1.sessionManager.getPlayerPlatform(playerData.username);
                // console.log('playerCredits', playerData.credits);
                //NOTE: low balance
                if (this.settings.currentBet > playerData.credits) {
                    console.log('Low Balance', playerData.credits);
                    console.log('Current Bet', this.settings.currentBet);
                    this.sendError("Low Balance");
                    return;
                }
                //TODO: bonus games 
                //free spins n boosters
                //NOTE: deduct balance
                this.deductPlayerBalance(this.settings.currentBet);
                this.playerData.totalbet += this.settings.currentBet;
                const spinId = platformSession.currentGameSession.createSpin();
                platformSession.currentGameSession.updateSpinField(spinId, 'betAmount', this.settings.currentBet);
                this.randomResultGenerator();
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
                //TODO:
                const resultmatrix = this.settings.resultSymbolMatrix;
                console.log("Result Matrix:", resultmatrix);
                console.log("base Pay", this.settings.Symbols[resultmatrix[0]].payout);
                (0, helper_1.checkForWin)(this);
                const playerData = this.settings._winData.slotGame.getPlayerData();
                console.log('playerCredits', playerData.credits);
            }
            catch (error) {
                console.error("Error in checkResult:", error);
            }
        });
    }
    randomResultGenerator() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                //TODO:
                const getRandomIndex = (maxValue) => {
                    return Math.floor(Math.random() * (maxValue + 1));
                };
                const reel = this.settings.reels;
                const index = getRandomIndex(reel.length - 1);
                this.settings.resultSymbolMatrix = [reel[index]];
            }
            catch (error) {
                console.error("Error in randomResultGenerator:", error);
            }
        });
    }
}
exports.SLONE = SLONE;
