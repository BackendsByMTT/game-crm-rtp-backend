import mongoose, { Document, Types } from "mongoose";
import { Card, gambleCardGame } from "./GambleGame";
import { WinData } from "./WinData";

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

export interface GameData {
  id: string;
  linesApiData: any[];
  Symbols: Symbol[];
  bonus: Bonus;
  bets: number[]; // Add this line to include bets property
  linesCount: number; // Add this line to include linesCount property
}


export interface GameSettings {
  currentGamedata: GameData;
  tempReels: any[][];
  matrix: { x: number; y: number };
  payLine: any[];
  scatterPayTable: any[];
  bonusPayTable: any[];
  useScatter: boolean;
  useWild: boolean;
  wildSymbol: WildSymbol;
  Symbols: any[];
  Weights: any[];
  resultSymbolMatrix: any[];
  lineData: any[];
  fullPayTable: any[];
  _winData: WinData | undefined;
  freeSpinStarted: boolean;
  resultReelIndex: any[];
  noOfBonus: number;
  noOfFreeSpins: number;
  totalBonuWinAmount: any[];
  jackpot: {
    symbolName: string;
    symbolsCount: number;
    symbolId: number;
    defaultAmount: number;
    increaseValue: number;
  };
  bonus: {
    start: boolean;
    stopIndex: number;
    game: any;
    id: number;
  };
  currentBet: number;
  currentLines: number;
  BetPerLines: number;
  startGame: boolean;
  gamble:gambleCardGame;
  reels: any[][];
}

export interface WildSymbol {
  SymbolName: string;
  SymbolID: number;
}


export interface UserData {
  Balance: number;
  haveWon: number;
  currentWining: number;
}
