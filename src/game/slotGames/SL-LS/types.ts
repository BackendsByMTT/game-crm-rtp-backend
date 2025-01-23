import { GameData } from "../BaseSlotGame/gameType";
import { WinData } from "../BaseSlotGame/WinData";

interface Symbol {
    Name: string;
    Id: number;
    payout: number;
    canmatch:[];
    reelInstance: { [key: string]: number };
}

export interface FrozenIndex {
    position: [number, number];
    prizeValue?:number;
    value: number;
    symbol:number|string;
  }

 
export interface bonusSymbol {
    position: [number, number];
    prizeValue:number;
    symbol:number|string;

  } 

//  export interface mysterySymbol {
//     position: [number, number];
//     prizeValue?:number;
//     symbol: number;
//  } 
export interface SLLSSETTINGS {
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
    payoutCombination: any [][],
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
    jackpot:{
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    },
    bar3:{
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    },
    bar2:{
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    },
    bar1:{
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    },
    isJackpot : boolean,
}


export enum specialIcons {
    wild = "Wild",
    bonus = "Bonus",
     jackpot = "Jackpot",
     bar3 = "Bar3",
     bar2 = "Bar2",
     bar1 = "Bar1"
}
