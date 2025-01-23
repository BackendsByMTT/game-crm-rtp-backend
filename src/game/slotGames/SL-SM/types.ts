import { GameData } from "../BaseSlotGame/gameType";
import { WinData } from "../BaseSlotGame/WinData";

interface Symbol {
    Name: string;
    Id: number;
    payout: number;
    reelInstance: { [key: string]: number };
}

export interface FrozenIndex {
    position: [number, number];
    prizeValue?:number;
    value: number;
    symbol:number|string;
  }

 
export interface bonusSymbol {
    id?:number;
    position: [number, number];
    prizeValue:number;
    symbol:number|string;

  } 

//  export interface mysterySymbol {
//     position: [number, number];
//     prizeValue?:number;
//     symbol: number;
//  } 
export interface SLSMSETTINGS {
    id: string;
    matrix: { x: number, y: number };
    currentGamedata: GameData;
    resultSymbolMatrix: any[];
    tempResultSymbolMatrix:any[];
    bonusResultMatrix:any[];
    lineData: any[],
    _winData: WinData | undefined;
    currentBet: number;
    baseBetAmount:number;
    currentLines: number;
    BetPerLines: number;
    bets: number[];
    reels: any[][];
    bonusReels: any[][];
    Symbols: Symbol[];
    BonusSymbols: Symbol[];
    stickyBonusValue:FrozenIndex[],
    stickySymbolCount: number [],
    stickySymbolCountProb :number [],
    prizeValue:number [],
    prizeValueProb: number [], 
    mysteryValues: number [],
    mysteryValueProb :number [],
    moonMysteryValues:number [],
    moonMysteryValueProb: number [], 
    bonusSymbolValue: bonusSymbol[],
    frozenIndices:bonusSymbol[],
    miniMultiplier:number,
    minorMultiplier:number,
    majorMultiplier:number,
    grandMultiplier:number,
    moonMultiplier:number,
    minMatchCount:number,
    freeSpinMatchCount:number,
    moonMysteryData:bonusSymbol[],
    isMoonJackpot:boolean,
    isStickyBonusSymbol:boolean,
    isGrandPrize:boolean,
    isStickyBonus:boolean,
    wildPayout:number,
    isAllWild:boolean,
    freeSpin: {
        freeSpinCount: number,
        freeSpinAwarded: number,
        useFreeSpin: boolean,
        freeSpinsAdded: boolean,
        freeSpinPayout:number
    };
    wild: {
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    },
    bonus:{
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    },
    stickyBonus:{
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    },
    mystery:{
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    },
    moonMystery:{
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    },
    mini:{
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    },
    minor:{
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    },
    major:{    
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    },
    moon:{    
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    }
}


export enum specialIcons {
    wild = "Wild",
    bonus = "Bonus",
    stickyBonus = "StickyBonus",
    mystery = "Mystery",
    moonMystery = "MoonMystery",
    mini = "mini",
    minor = "minor",
    major = "major",
    moon = "MOON"
}
