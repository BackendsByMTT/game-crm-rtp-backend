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
exports.SLPB = void 0;
const RandomResultGenerator_1 = require("../RandomResultGenerator");
const helper_1 = require("./helper");
class SLPB {
    constructor(currentGameData) {
        this.currentGameData = currentGameData;
        this.playerData = {
            haveWon: 0,
            currentWining: 0,
            totalbet: 0,
            rtpSpinCount: 0,
            totalSpin: 0,
            currentPayout: 0,
        };
        this.settings = (0, helper_1.initializeGameSettings)(currentGameData, this);
        (0, helper_1.generateInitialReel)(this.settings);
        (0, helper_1.sendInitData)(this);
        (0, helper_1.makePayLines)(this);
    }
    get initSymbols() {
        const Symbols = [];
        //filter symbols which appear only in base game
        const baseGameSymbol = this.currentGameData.gameSettings.Symbols.filter((symbol) => !symbol.isBonusSymbol || symbol.isSpecialSymbol);
        baseGameSymbol.forEach((Element) => {
            Symbols.push(Element);
        });
        return Symbols;
    }
    get initBonusSymbols() {
        const Symbols = [];
        //filter symbols which appear only in base game
        const bonusGameSymbol = this.currentGameData.gameSettings.Symbols.filter((symbol) => symbol.isBonusSymbol || symbol.isSpecialSymbol);
        bonusGameSymbol.forEach((Element) => {
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
        console.log(data, "DATA");
        this.settings.currentLines = data.currentLines;
        this.settings.BetPerLines = this.settings.currentGamedata.bets[data.currentBet];
        this.settings.currentBet = this.settings.BetPerLines;
    }
    spinResult() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const playerData = this.getPlayerData();
                if (this.settings.currentBet > playerData.credits) {
                    console.log(this.settings.currentBet + playerData.credits);
                    this.sendError("Low Balance");
                    return;
                }
                if (!this.settings.freeSpin.useFreeSpin) {
                    yield this.deductPlayerBalance(this.settings.currentBet);
                    this.playerData.totalbet += this.settings.currentBet;
                }
                yield new RandomResultGenerator_1.RandomResultGenerator(this);
                (0, helper_1.checkForWin)(this);
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
}
exports.SLPB = SLPB;
