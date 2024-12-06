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
    coinsvalue?:number;
    value: number;
    symbol:number|string;
  }

 
export interface bonusSymbol {
    position: [number, number];
    coinsvalue:number;
    symbol:number|string;

  } 

//  export interface mysterySymbol {
//     position: [number, number];
//     coinsvalue?:number;
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
    pollyAdjacentColumn: number [],
    pollyAdjacentColumnProb :number [],
    coinsvalue:number [],
    coinsvalueProb: number [],
    coinsvalueDuringFreeSpins: number [],
    coinsvalueDuringFreeSpinsProb: number [],
    pollyAdjacentSymbol: number [],
    pollyAdjacentSymbolProb :number [],
    tommyColossalSymbol:number [],
    tommyColossalSymbolProb: number [],
    colossalMergeProbability: number, 
    bonusSymbolValue: bonusSymbol[],
    frozenIndices:bonusSymbol[],
    miniMultiplier:number,
    megaMultiplier:number,
    majorMultiplier:number,
    grandMultiplier:number,
    isGrandPrize:boolean,
    isArthurBonus:boolean,
    isTomBonus:boolean,
    isPollyBonus:boolean,
    thunderBonus: {
        thunderSpinCount: number,
        thunderSpinAwardedCount: number,
        isThunderBonus: boolean,
        thunderSpinsAdded: boolean,
        thunderSpinPayout:number
    };
    freeSpin: {
        freeSpinCount: number,
        freeSpinAwardedCount: number,
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
    coins:{
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    },
    arthurBonus:{
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    },
    tomBonus:{
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    },
    pollyBonus:{
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    },
    mini:{
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    },
    major:{    
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    },
    mega:{    
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    },
    thomas:{    
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    }
}


export enum specialIcons {
    wild = "Wild",
    bonus = "Bonus",
    coins = "Coins",
    mini = "Mini",
    major = "Major",
    mega = "Mega",
    arthurBonus = "ArthurBonus",
    tomBonus = "TomBonus",
    pollyBonus =  "PollyBonus",
    thomas = "Thomas"
}
