import { GameData } from "../BaseSlotGame/gameType";
import { WinData } from "../BaseSlotGame/WinData";

interface Symbol {
  Name: string;
  Id: number;
  payout: number;
  reelInstance: { [key: string]: number };
  multiplier: number[][];
  useWildSub: boolean;
}
export interface SLGOWSETTINGS {
  id: string;
  matrix: { x: number; y: number };
  currentGamedata: GameData;
  resultSymbolMatrix: any[];
  lineData: any[];
  _winData: WinData | undefined;
  currentBet: number;
  currentLines: number;
  BetPerLines: number;
  bets: number[];
  reels: any[][];
  Symbols: Symbol[];
  featureAll: boolean;
  featureAllMult: number[];
  freeSpin: {
    SymbolName: string; //scatter
    SymbolID: string;
    isEnabled: boolean;
    isFreeSpin: boolean;
    isTriggered: boolean;
    freeSpinCount: number;
    countIncrement: number[];
    goldColCountProb: number[]; // 0 row, 1 row , 2 rows
    goldColProb: number[]; // 0th row gold, 1st row gold, 2nd row gold, 3rd row gold, 4th row gold
  };
  gamble: {
    isEnabled: boolean;
  };
  blueWild: {
    SymbolName: string;
    SymbolID: number;
  };
  goldWild: {
    SymbolName: string;
    SymbolID: number;
    cols: number[];
  };
}

export enum specialIcons {
  blueWild = "BlueWild",
  goldWild = "GoldWild",
  freeSpin = "Scatter",
}
