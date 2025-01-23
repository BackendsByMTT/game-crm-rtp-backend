import { GameData } from "../BaseSlotGame/gameType";
import { WinData } from "../BaseSlotGame/WinData";

interface Symbol {
  Name: string;
  Id: number;
  payout: number;
  useBonus: boolean;
  reelInstance: { [key: string]: number };
}
export interface SLFLCSETTINGS {
  id: string;
  matrix: { x: number, y: number };
  currentGamedata: GameData;
  resultSymbolMatrix: any[];
  bonusResultMatrix: any[];
  lineData: any[],
  _winData: WinData | undefined;
  currentBet: number;
  currentLines: number;
  BetPerLines: number;
  bets: number[];
  reels: any[][];
  bonusReels: any[][];
  Symbols: Symbol[];
  isFreespin: boolean;
  freespinCount: number;
  bonus: {
    isTriggered: boolean;
    scatterCount: number;
    spinCount:number
  },
  wild: {
    SymbolName: string;
    SymbolID: number;
    useWild: boolean
  },
  scatter: {
    SymbolName: string;
    SymbolID: number;
    bonusTrigger: [
      {
        count: [number,number];
        rows: number
      }
    ],
    scatterMultipliers: number[],
    scatterProbs: number[],
    values:ValueType[]
  },
  freespin: {
    SymbolName: string;
    SymbolID: number;
    defaultOptionIndex:number;
    optionIndex: number //index 
    options: FreespinOption[]
  },
  blank: {
    SymbolName: string;
    SymbolID: number;
  }
}


export enum specialIcons {
  scatter = "Scatter",
  wild = "Wild",
  freespin = "Freespin",
  blank = "Blank"
}
export type FreespinOption = {
  count: number;
  multiplier: number[];
}
export type ValueType = {
  index:[number,number];
  value:number;
}
