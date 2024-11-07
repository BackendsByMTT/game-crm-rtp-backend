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
exports.SLBB = void 0;
const helper_1 = require("./helper");
const RandomResultGenerator_1 = require("../RandomResultGenerator");
class SLBB {
    constructor(currentGameData) {
        this.currentGameData = currentGameData;
        this.playerData = {
            haveWon: 0,
            currentWining: 0,
            totalbet: 0,
            rtpSpinCount: 0,
        };
        this.settings = (0, helper_1.initializeGameSettings)(currentGameData, this);
        (0, helper_1.makePayLines)(this);
        (0, helper_1.generateInitialReel)(this.settings);
        (0, helper_1.generateInitialBonusReel)(this.settings);
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
        this.currentGameData.sendMessage(action, message);
    }
    sendError(message) {
        this.currentGameData.sendError(message);
    }
    sendAlert(message) {
        this.currentGameData.sendAlert(message);
    }
    incrementPlayerBalance(amount) {
        this.currentGameData.updatePlayerBalance(amount);
    }
    decrementPlayerBalance(amount) {
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
            default:
                this.sendMessage(response.id, "invalid request");
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
                const { freeSpin, bonus } = this.settings;
                if (!freeSpin.isFreeSpin && this.settings.currentBet > playerData.credits) {
                    this.sendError("Low Balance");
                    return;
                }
                if (!freeSpin.isFreeSpin) {
                    this.decrementPlayerBalance(this.settings.currentBet);
                    this.playerData.totalbet += this.settings.currentBet;
                }
                if (!bonus.isTriggered) {
                    this.decrementPlayerBalance(this.settings.currentBet);
                }
                // if (heisenberg.freeSpin.freeSpinCount === 1) {
                //   heisenberg.isTriggered= false;
                // }
                if (freeSpin.count === 1) {
                    freeSpin.isFreeSpin = false;
                }
                if (
                // freeSpin.isFreeSpin &&
                freeSpin.count > 0 &&
                    !this.settings.bonus.isTriggered) {
                    freeSpin.count--;
                    this.settings.currentBet = 0;
                    console.log(freeSpin.count, "this.settings.freeSpinCount");
                }
                // this.incrementPlayerBalance(this.playerData.currentWining)
                if (!this.settings.bonus.isTriggered) {
                    new RandomResultGenerator_1.RandomResultGenerator(this);
                }
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
                    // console.log(`Spin ${i + 1} completed. ${this.playerData.totalbet} , ${won}`);
                }
                let rtp = 0;
                if (spend > 0) {
                    rtp = won / spend;
                }
                // console.log('RTP calculated:', rtp * 100);
                return;
            }
            catch (error) {
                console.error("Failed to calculate RTP:", error);
                this.sendError("RTP calculation error");
            }
        });
    }
}
exports.SLBB = SLBB;
