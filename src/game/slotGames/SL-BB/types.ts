import { GameData } from "../BaseSlotGame/gameType";
import { WinData } from "../BaseSlotGame/WinData";

export interface Symbol {
  Name: string;
  Id: number;
  multiplier: [number,number][];
  useWildSub: boolean;
  useHeisenberg: boolean;
  reelInstance: { [key: string]: number };

}

export type valueType = {
  index: [number, number],
  value: number
}


export interface SLBBSETTINGS {
  id: string;
  matrix: { x: number, y: number };
  currentGamedata: GameData;
  resultSymbolMatrix: any[];
  isCashCollect: boolean;
  // prevresultSymbolMatrix: any[];
  bonusResultMatrix: any[];
  // heisenbergFreeze: Set<string>;
  lineData: any[],
  _winData: WinData | undefined;
  // matchedIndices: { col: number; row: number }[][];
  currentBet: number;
  currentLines: number;
  BetPerLines: number;
  bets: number[];
  reels: any[][];
  bonusReels: any[][],
  Symbols: Symbol[];
  jackpot: {
    isTriggered: boolean;
    payout: number;
  },
  grandPrize: {
    isTriggered: boolean;
    payout: number;
  },
  freeSpin: {
    isEnabled: boolean,
    isTriggered: boolean,
    count: number,
    isFreeSpin: boolean,
    cashCollectValues: valueType[]
  };
  wild: {
    SymbolName: string;
    SymbolID: string;
    useWild: boolean
  };
  link: {
    SymbolName: string;
    SymbolID: string;
    useWild: boolean;
  };
  megalink: {
    SymbolName: string;
    SymbolID: string;
    useWild: boolean;

  };
  cashCollect: {
    SymbolName: string;
    SymbolID: string;
    useWild: boolean;
  };
  coins: {
    SymbolName: string;
    SymbolID: string;
    useWild: boolean;
    values: valueType[]
  };
  prizeCoin: {
    SymbolName: string;
    SymbolID: string;
    useWild: boolean;
  };
  losPollos: {
    SymbolName: string;
    SymbolID: string;
    useWild: boolean;
    values: valueType[]
  };
  bonus: {
    isTriggered: boolean;
    count: number,
    payout: number;
  };
  cashCollectPrize: {
    isTriggered: boolean,
    payout: number,
  };
}


export enum specialIcons {
  wild = "Wild",
  link = "Link",
  megalink = "MegaLink",
  cashCollect = "CashCollect",
  coins = "Coins",
  prizeCoin = "PrizeCoin",
  losPollos = "LosPollos",
}
