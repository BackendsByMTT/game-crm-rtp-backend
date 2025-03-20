export interface PlinkoBaseSettings {
    id: string;
    currentGamedata: any;
    currentBet: number;
    bets: number[];
    risk:number[];
    selectedRisk:number;
    rows:number[];
    selectedRows:number;
    multiplier:number[][][];
    prob:number[][][];
    ballFinalPosition: number;
    selectedMultiplier: number;
  }
  
  
  export enum specialIcons {
    wild = "Wild",
    expand = "Expand"
  }
  