

export interface SymbolType {
  Name: string;
  Id: number;
  useWildSub: boolean;
  reelInstance: { [key: string]: number };
  multiplier: [number, number][];
}

export type GameResult = number[][];

export interface WinningCombination {
  symbolId: number;
  positions: [number, number][];
  payout: number;
}

export interface SLTMSETTINGS {
  id: string;
  isSpecial: boolean;
  matrix: { x: number, y: number };
  isEnabled: boolean;
  bets: number[];
  Symbols: SymbolType[];
  resultSymbolMatrix: any[][];
  currentGamedata: any;
  _winData: any;
  currentBet: number;
  currentLines: number;
  BetPerLines: number;
  reels: number[][];
  // freeSpinReels: number[][];
  minMatchCount: number;
  level: 0 | 1 | 2 | 3 | 4;
  isLevelUp: boolean;
  isFreeSpin: boolean;
  isFreeSpinTriggered: boolean;
  freeSpinCount: number;
  freeSpinIncrement: number;
  freeSpinRetriggerProbs: number[];
  // freeSpinSymbolId: number;
  // freeSpinMultipliers: number[];
  // maxMultiplier: number;
  winningCombinations: WinningCombination[]
  wild: {
    SymbolId: string;
    SymbolName: string;
    cutoffLevel: number;
    subs: number[];

  },
  freeSpin: {
    SymbolId: string;
    SymbolName: string
  }
}

export enum SpecialSymbols {
  "WILD" = "Wild",
  "FREE_SPIN" = "FreeSpin",
}

// export interface FreeSpinResponse {
//   freeSpinCount: number[];
//   freeSpinMultipliers: number[][];
//   combinations: WinningCombination[][]
//   results: number [][][]
//   isRetriggered : boolean[]
//   payouts: number[]
// }
