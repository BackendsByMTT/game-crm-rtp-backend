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
exports.SLSM = void 0;
const sessionManager_1 = require("../../../dashboard/session/sessionManager");
const RandomResultGenerator_1 = require("../RandomResultGenerator");
const gamble_1 = require("./gamble");
const helper_1 = require("./helper");
class SLSM {
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
        const baseGameSymbol = this.currentGameData.gameSettings.Symbols.filter((symbol) => !symbol.isBonusGameSymbol || symbol.isSpecialSymbol);
        baseGameSymbol.forEach((Element) => {
            Symbols.push(Element);
        });
        return Symbols;
    }
    get initBonusSymbols() {
        const Symbols = [];
        //filter symbols which appear only in base game
        const bonusGameSymbol = this.currentGameData.gameSettings.Symbols.filter((symbol) => symbol.isBonusGameSymbol || symbol.isSpecialSymbol);
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
            case "GAMBLEINIT":
                this.deductPlayerBalance(this.playerData.currentWining);
                this.playerData.haveWon -= this.playerData.currentWining;
                // this.sendMessage("gambleInitData", sendData);
                break;
            case "GAMBLERESULT":
                let result = (0, gamble_1.getGambleResult)({ selected: response.cardType });
                //calculate payout
                switch (result.playerWon) {
                    case true:
                        this.playerData.currentWining *= 2;
                        result.balance = this.getPlayerData().credits + this.playerData.currentWining;
                        result.currentWinning = this.playerData.currentWining;
                        break;
                    case false:
                        result.currentWinning = 0;
                        result.balance = this.getPlayerData().credits;
                        this.playerData.currentWining = 0;
                        break;
                }
                this.sendMessage("GambleResult", result); // result card 
                break;
            case "GAMBLECOLLECT":
                this.playerData.haveWon += this.playerData.currentWining;
                this.updatePlayerBalance(this.playerData.currentWining);
                this.sendMessage("GambleCollect", {
                    currentWinning: this.playerData.currentWining,
                    balance: this.getPlayerData().credits
                }); // balance , currentWinning
                break;
            default:
                console.warn(`Unhandled message ID: ${response.id}`);
                this.sendError(`Unhandled message ID: ${response.id}`);
                break;
        }
    }
    prepareSpin(data) {
        this.settings.currentLines = data.currentLines;
        this.settings.BetPerLines = this.settings.currentGamedata.bets[data.currentBet];
        this.settings.currentBet = this.settings.BetPerLines;
    }
    spinResult() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const playerData = this.getPlayerData();
                const platformSession = yield sessionManager_1.sessionManager.getPlaygroundUser(playerData.username);
                if (this.settings.currentBet > playerData.credits) {
                    console.log(this.settings.currentBet + playerData.credits);
                    this.sendError("Low Balance");
                    return;
                }
                if (!this.settings.freeSpin.useFreeSpin) {
                    yield this.deductPlayerBalance(this.settings.currentBet);
                    // Ensure the totalbet is limited to 4 decimal places
                    this.playerData.totalbet = parseFloat((this.playerData.totalbet + this.settings.currentBet).toFixed(4));
                }
                const spinId = platformSession.currentGameSession.createSpin();
                platformSession.currentGameSession.updateSpinField(spinId, 'betAmount', this.settings.currentBet);
                yield new RandomResultGenerator_1.RandomResultGenerator(this);
                (0, helper_1.checkForWin)(this);
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
}
exports.SLSM = SLSM;
