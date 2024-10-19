export interface SymbolType {
  Name: string;
  Id: number;
  useWildSub: boolean;
  reelInstance: { [key: string]: number };
  multiplier: [number, number][];
}

export type GameResult = number[][];

// export interface GameConfig {
//   rows: number;
//   reels: number;
//   minMatchCount: number;
// }

export interface WinningCombination {
  symbolId: number;
  positions: [number, number][];
  payout: number;
}

export interface SLLOLSETTINGS {
  id: string;
  isSpecial: boolean;
  matrix: { x: number, y: number };
  isEnabled: boolean;
  bets: number[];
  Symbols: SymbolType[];
  resultSymbolMatrix: number[][];
  currentGamedata: any;
  _winData: any;
  currentBet: number;
  currentLines: number;
  BetPerLines: number;
  reels: number[][];
  defaultPayout: number;
  minMatchCount: number;
  isFreeSpin: boolean;
  freeSpinCount: number;
  freeSpinMultipliers: number[];
}
