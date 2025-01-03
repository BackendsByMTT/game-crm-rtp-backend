import { Types } from "mongoose";
import { gambleCardGame } from "./newGambleGame";
import { WinData } from "./WinData";


//types
export interface IGame extends Document {
  name: string;
  thumbnail: string;
  url: string;
  type: string;
  category: string;
  status: string;
  tagName: string;
  slug: string;
  payout: Types.ObjectId;
  description: string;
  createdAt: Date
}

export interface IPlatform extends Document {
  name: string;
  games: IGame[]
}

export interface Symbol {
  Name: string;
  Id: number | null;
  weightedRandomness: number;
  useWildSub: boolean;
  multiplier: number[][];
  defaultAmount: number[];
  symbolsCount: number[];
  increaseValue: number[];
  reelInstance: number[]; // Ensure reelInstance is included
}

export interface Bonus {
  isEnabled: boolean;
  type: string;
  noOfItem: number;
  payOut: number[];
  payOutProb: number[];
  payTable: number[];
}
export interface MiniSpinBonus {
  isEnabled: boolean;
  type: string;
  noOfItem: number;
  symbols: number[];
  payOut: number[];
  miniSlotProb: number[];
  outerRingProb: number[];
  winningValue: any[];
}

export interface GameData {
  id: string;
  linesApiData: any[];
  Symbols: Symbol[];
  bonus: Bonus;
  bets: number[]; // Add this line to include bets property
  matrix: { x: number; y: number };
  linesCount: number; // Add this line to include linesCount property
  betMultiplier: number[]
}


export interface GameSettings {
  currentGamedata: GameData;
  tempReels: any[][];
  payLine: any[];
  useScatter: boolean;
  wildSymbol: WildSymbol;
  Symbols: any[];
  Weights: any[];
  resultSymbolMatrix: any[];
  lineData: any[];
  fullPayTable: any[];
  _winData: WinData | undefined;
  resultReelIndex: any[];
  noOfBonus: number;
  totalBonuWinAmount: any[];
  jackpot: {
    symbolName: string;
    symbolsCount: number;
    symbolId: number;
    defaultAmount: number;
    increaseValue: number;
    useJackpot: boolean;
  };
  bonus: {
    start: boolean;
    stopIndex: number;
    game: any;
    id: number;
    symbolCount: number,
    pay: number,
    useBonus: boolean,
  };
  freeSpin: {
    symbolID: string,
    freeSpinMuiltiplier: [],
    freeSpinStarted: boolean,
    freeSpinCount: 0,
    noOfFreeSpins: 0,
    useFreeSpin: boolean,
    freeSpinsAdded: boolean,
  };
  scatter: {
    symbolID: string,
    multiplier: [],
    useScatter: boolean
  }
  currentBet: number;
  currentLines: number;
  BetPerLines: number;
  startGame: boolean;
  gamble: gambleCardGame;
  reels: any[][];
  currentMoolahCount: number,
}

export interface WildSymbol {
  SymbolName: string;
  SymbolID: number;
  useWild: boolean

}


export interface UserData {
  Balance: number;
  haveWon: number;
  currentWining: number;
}
