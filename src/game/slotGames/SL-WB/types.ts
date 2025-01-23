import { GameData } from "../BaseSlotGame/gameType";
import { WinData } from "../BaseSlotGame/WinData";

interface Symbol {
    Name: string;
    Id: number;
    reelInstance: { [key: string]: number };
}
type WheelFeature = {
    featureValues: number[]; 
    featureProbs: number[];  
};

 
export type FeatureType = "MINI" | "MINOR" | "MAJOR" | "FREESPIN" | "GRAND" ;

export interface SLWBSETTINGS {
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
    smallWheelFeature: WheelFeature;
    mediumWheelFeature: WheelFeature;
    largeWheelFeature: WheelFeature;
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
    goldenBonus:{
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    },
    isBonusTriggered:boolean,
    issmallBonusTriggered:boolean,
    ismediumBonusTriggered:boolean,
    islargeBonusTriggered:boolean,
    indexToStop:number,
    bonusCount: number[],
    bonusTriggerCount:number,
    bonusTriggerCountDuringFreeSpin:number,
    bonusCountDuringFreeSpins:number[],
    freeSpinDuringBonus:number[],
    
}


export enum specialIcons {
    wild = "Wild",
    bonus = "Bonus",
    goldenBonus = "GoldenBonus",
}
