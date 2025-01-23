import { GameData } from "../BaseSlotGame/gameType";
import { WinData } from "../BaseSlotGame/WinData";

interface Symbol {
    Name: string;
    Id: number;
    payout: number;
    reelInstance: { [key: string]: number };
}
export interface starBurstResponse {
  resultMatrix: any[];
  symbolsToEmit: any[];
  linesToEmit: any[];
  payout: number
}
export interface SLPSFSETTINGS {
    id: string;
    matrix: { x: number, y: number };
    currentGamedata: GameData;
    resultSymbolMatrix: any[];
    lineData: any[],
    _winData: WinData | undefined;
    currentBet: number;
    currentLines: number;
    BetPerLines: number;
    bets: number[];
    reels: any[][];
    Symbols: Symbol[];
    starBurstTriggerMatrix : any[]
    isStarBurst: boolean;
    starBurstReel: number[];
    starBurstResponse: starBurstResponse[]
    wild: {
        SymbolName: string;
        SymbolID: number;
        useWild: boolean
    },
}


export enum specialIcons {
    wild = "Wild",
}
