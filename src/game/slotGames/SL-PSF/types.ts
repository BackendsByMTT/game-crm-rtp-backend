import { GameData } from "../BaseSlotGame/gameType";
import { WinData } from "../BaseSlotGame/WinData";

interface Symbol {
    Name: string;
    Id: number;
    payout: number;
    reelInstance: { [key: string]: number };
}
export interface SLPSFSETTINGS {
    id: string;
    matrix: { x: number, y: number };
    currentGamedata: GameData;
    resultSymbolMatrix: any[];
    lineData: any[],
    _winData: WinData | undefined;
    currentBet: number;
    currentLines: number;
    BetPerLines: number;
    bets: number[];
    reels: any[][];
    Symbols: Symbol[];
    isWining: boolean;
    freeSpin: {
        SymbolName: string,
        SymbolID: string,
        freeSpinMuiltiplier: any[],
        freeSpinStarted: boolean,
        freeSpinCount: number,
        noOfFreeSpins: number,
        useFreeSpin: boolean,
        freeSpinsAdded: boolean,
        jokerSymbols: any[],
        trumpSymbols: any[]
    };
    wild: {
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    },
    trumpFreeSpin: {
        SymbolName: string;
        SymbolID: number;

    }
}


export enum specialIcons {
    trumpFreeSpin = "TrumpFreeSpin",
    wild = "Wild",
    freeSpin = "FreeSpin"
}