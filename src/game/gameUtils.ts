import { bonusGame } from "./bonusResults";
import { GambleGame } from "./gambleResults";
import { gameSettings } from "./global";
import { WinData } from "./slotResults";

export interface SymbolData {
  symbolName: string;
  symbolID: number;
  useWildSub: boolean;
  multiplier: number[];
  freespins: number;
}

export enum specialIcons {
  bonus = "Bonus",
  scatter = "Scatter",
  jackpot = "Jackpot",
  wild = "Wild",
  any = "any",
}

export enum bonusGameType {
  tap = "tap",
  spin = "spin",
  default = "default",
}
export interface PlayerData {
  Balance: number;
  haveWon: number;
  currentWining: number;
  playerId: string,
  // haveUsed: number
}
export interface PayLine {
  line: string[];
  pay: number;
  freeSpins: number;
}
export interface ScatterPayEntry {
  symbolCount: number;
  symbolID: number;
  pay: number;
  freeSpins: number;
}
export interface BonusPayEntry {
  symbolCount: number;
  symbolID: number;
  pay: number;
  highestPayMultiplier: number;
}

export interface WildSymbol {
  SymbolName: string;
  SymbolID: number;
}

export interface WeightedItem<T> {
  item: T;
  index: number;
}
export interface winning {
  winningSymbols: any[];
  WinningLines: any[];
  TotalWinningAmount: number;
  shouldFreeSpin: boolean;
  freeSpins: number;
  currentBet: number;
}

export interface GameSettings {
  currentGamedata: any;
  matrix: { x: number; y: number };
  payLine: PayLine[];
  scatterPayTable: ScatterPayEntry[];
  bonusPayTable: BonusPayEntry[];
  useScatter: boolean;
  useWild: boolean;
  Symbols: string[];
  Weights: number[];
  wildSymbol: WildSymbol;
  resultSymbolMatrix: string[][] | undefined;
  lineData: number[][];
  fullPayTable: PayLine[];
  freeSpinStarted: boolean;
  resultReelIndex: number[],
  noOfBonus: number,
  noOfFreeSpins: number,
  totalBonuWinAmount: number[],
  jackpot: {
    symbolName: string;
    symbolId: number;
    symbolsCount: number;
    defaultAmount: number;
    increaseValue: number;
  };
  _winData: WinData;
  bonus: {
    game: bonusGame;
    start: boolean;
    stopIndex: number;
    id: number;
    // maxPay: number
  };
  tempReels: string[][];
  reels: string[][];
  currentBet: number;
  BetPerLines: number,
  currentLines: number,
  startGame: boolean;
  initiate: (arg: any, arg2: string) => void;
  gamble: {
    game: GambleGame;
    maxCount: number;
    start: boolean;
  };
}

export function weightedRandom<T>(
  items: T[],
  weights: number[]
): WeightedItem<T> {
  if (items.length !== weights.length) {
    throw new Error("Items and weights must be of the same size");
  }
  if (!items.length) {
    throw new Error("Items must not be empty");
  }
  // Preparing the cumulative weights array.
  const cumulativeWeights: number[] = [];
  for (let i = 0; i < weights.length; i += 1) {
    cumulativeWeights[i] = weights[i] + (cumulativeWeights[i - 1] || 0);
  }
  // Getting the random number in a range of [0...sum(weights)]
  const maxCumulativeWeight = cumulativeWeights[cumulativeWeights.length - 1];
  const randomNumber = maxCumulativeWeight * Math.random();
  // Picking the random item based on its weight.
  for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
    if (cumulativeWeights[itemIndex] >= randomNumber) {
      return {
        item: items[itemIndex],
        index: itemIndex,
      };
    }
  }
  // This should not happen if the weights are correctly defined,
  // but if we get here, return the last item.
  return {
    item: items[items.length - 1],
    index: items.length - 1,
  };
}

// Function to generate a 5x18 matrix of randomly selected items based on weights
export function generateMatrix(n_Rows: number, n_Columns: number): any[][] {
  const matrix: any[][] = [];
  for (let i = 0; i < n_Rows; i++) {
    const row: any[] = [];
    for (let j = 0; j < n_Columns; j++) {
      const result = weightedRandom(gameSettings.Symbols, gameSettings.Weights);
      row.push(result.item);
    }
    matrix.push(row);
  }
  // console.log(matrix);
  return matrix;
}

export function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    let k = array[i];
    array[i] = array[j];
    array[j] = k;
  }
}

export function convertData(data: string[][]): string[] {
  const result: string[] = [];
  for (const row of data) {
    const convertedRow = Array.from(Array(row.length + 1).keys()).join(",");
    result.push(`"${convertedRow}"`);
  }
  return result;
}

export function convertSymbols(data) {
  let uiData = {
    symbols: [],
  };
  if (!Array.isArray(data)) {
    console.error("Input data is not an array");
    return uiData;
  }
  data.forEach((element) => {
    let symbolData = {
      ID: element.Id,
      Name: element.Name || {},
      multiplier: {},
      defaultAmount: element.defaultAmount || {},
      symbolsCount: element.symbolsCount || element.symbolCount || {},
      increaseValue: element.increaseValue || {},
      freeSpin: element.freeSpin || 0
    };
    // if (element.multiplier) {
    //   const multiplierObject = {};
    //   element.multiplier.forEach((item, index) => {
    //     multiplierObject[(5 - index).toString() + "x"] = item;
    //   });
    //   symbolData.multiplier = multiplierObject;
    // }
    uiData.symbols.push(symbolData);
  });

  return uiData;
}
export function removeRecurringIndexSymbols(
  symbolsToEmit: string[][]
): string[][] {
  const seen = new Set<string>();
  const result: string[][] = [];

  symbolsToEmit.forEach((subArray) => {
    if (!Array.isArray(subArray)) {
      console.warn('Expected an array but got', subArray);
      return;
    }
    const uniqueSubArray: string[] = [];
    subArray.forEach((symbol) => {
      if (!seen.has(symbol)) {
        seen.add(symbol);
        uniqueSubArray.push(symbol);
      }
    });
    if (uniqueSubArray.length > 0) {
      result.push(uniqueSubArray);
    }
  });

  return result;
}
export function combineUniqueSymbols(symbolsToEmit: string[][]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  symbolsToEmit.forEach((subArray) => {
    subArray.forEach((symbol) => {
      if (!seen.has(symbol)) {
        seen.add(symbol);
        result.push(symbol);
      }
    });
  });

  return result;
}

// Test the function
