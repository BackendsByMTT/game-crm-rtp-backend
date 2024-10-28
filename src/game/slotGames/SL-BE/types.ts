import { GameData } from "../BaseSlotGame/gameType";
import { WinData } from "../BaseSlotGame/WinData";

interface Symbol {
    Name: string;
    Id: number;
    payout: number;
    reelInstance: { [key: string]: number };
}
export interface SLBESETTINGS {
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
    isLeftWinTrue: boolean;
    freeSpin: {
        symbolID: string,
        freeSpinMuiltiplier: any[],
        freeSpinStarted: boolean,
        freeSpinCount: number,
        noOfFreeSpins: number,
        useFreeSpin: boolean,
        freeSpinsAdded: boolean,
    };
    wild: {
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    },
    vampireMan: {
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    },
    vampireWomen: {
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    },
    HumanMan: {
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    },
    HumanWomen: {
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    }
}


export enum specialIcons {
    wild = "Wild",
    FreeSpin = "FreeSpin",
    VampireMan = "VampireMan",
    VampireWomen = "VampireWomen",
    HumanMan = "HumanMan",
    HumanWomen = "HumanMan"
}