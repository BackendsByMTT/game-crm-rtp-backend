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
exports.WinData = void 0;
class WinData {
    constructor(slotGame) {
        this.resultReelIndex = [];
        this.freeSpins = 0;
        this.winningLines = [];
        this.winningSymbols = [];
        this.winningSymbolsFreeSpin = [];
        this.winningLinesFreeSpin = [];
        this.totalWinningAmount = 0;
        this.slotGame = slotGame;
        this.jackpotwin = 0;
        this.specialFeatures = {
            jackpot: {
                amountWon: 0,
            },
            scatter: {
                amountWon: 0,
            },
            bonus: {
                amountWon: 0,
            },
        };
    }
    updateBalance() {
        return __awaiter(this, void 0, void 0, function* () {
            this.slotGame.updatePlayerBalance(this.totalWinningAmount);
            this.slotGame.playerData.haveWon += this.totalWinningAmount;
            this.slotGame.playerData.currentWining = this.totalWinningAmount;
            // TODO: Need to work here
        });
    }
}
exports.WinData = WinData;
