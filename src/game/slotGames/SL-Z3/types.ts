import { GameData } from "../BaseSlotGame/gameType";
import { WinData } from "../BaseSlotGame/WinData";

interface Symbol {
    Name: string;
    Id: number;
    payout: number;
    reelInstance: { [key: string]: number };
}
export interface ZEUSSETTINGS {
    id: string;
    matrix: { x: number, y: number };
    currentGamedata: GameData;
    resultSymbolMatrix: any[];
    resultSymbolMatrixWithoutNull:any[];
    lineData: any[],
    matchCountOfLines: any[][],
    _winData: WinData | undefined;
    currentBet: number;
    baseBetAmount:number;
    currentLines: number;
    BetPerLines: number;
    bets: number[];
    reels: any[][];
    Symbols: Symbol[];
    freeSpin: {
        freeSpinCount: number,
        useFreeSpin: boolean,
        freeSpinsAdded: boolean,
    };
    replacedToWildIndices:any[],
    wild: {
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    },
    freeSpinSymbol:{
        symbolID: string,
        multiplier:any[];
    }
}


export enum specialIcons {
    wild = "Wild",
    FreeSpin = "FreeSpin",
}