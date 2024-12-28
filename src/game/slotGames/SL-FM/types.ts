import { BotList } from "aws-sdk/clients/chime";
import { GameData } from "../BaseSlotGame/gameType";
import { WinData } from "../BaseSlotGame/WinData";

interface Symbol {
    Name: string;
    Id: number;
    payout: number;
    reelInstance: { [key: string]: number };
}

export interface SLFMSETTINGS {
    id: string;
    matrix: { x: number, y: number };
    currentGamedata: GameData;
    resultSymbolMatrix: any[];
    lineData: any[],
    _winData: WinData | undefined;
    currentBet: number;
    baseBetAmount:number;
    currentLines: number;
    BetPerLines: number;
    bets: number[];
    reels: any[][];
    Symbols: Symbol[];
    anyMatchCount:number;
    freeSpin: {
        freeSpinCount: number,
        freeSpinAwarded: number,
        useFreeSpin: boolean,
        freeSpinPayout:number,
        freeSpinsAdded: boolean,
    };
    wild: {
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    },
    bonus:{
        SymbolName: string;
        SymbolID: number;
        useWild: boolean;
    },
    scatter:{
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    },
    wildCountsToFreeGames:object,
    bonusCountsToFreeGames:object,
    scatterCountsToMultiplier:object,
    isMinor:boolean,
    isMajor:boolean,
    isGrand:boolean

}


export enum specialIcons {
    wild = "Wild",
    bonus = "Bonus",
     scatter = "Scatter"
}
