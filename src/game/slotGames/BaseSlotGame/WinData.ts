import { ISpecialFeatures } from "../../../dashboard/session/sessionTypes";
import SlotGame from "../slotGame";
import BaseSlotGame from "./BaseSlotGame";

export class WinData {
    freeSpins: number;
    winningSymbols: any[];
    winningLines: any[];
    winningSymbolsFreeSpin: any[];
    winningLinesFreeSpin: any[];
    totalWinningAmount: number;
    resultReelIndex: number[] = [];
    slotGame: BaseSlotGame;

    jackpotwin: number;
    specialFeatures: ISpecialFeatures;

    constructor(slotGame: any) {
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

    async updateBalance() {
        this.slotGame.updatePlayerBalance(this.totalWinningAmount);
        this.slotGame.playerData.haveWon += this.totalWinningAmount;
        this.slotGame.playerData.currentWining = this.totalWinningAmount;
        // TODO: Need to work here

    }
}
