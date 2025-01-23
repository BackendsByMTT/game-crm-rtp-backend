
export interface KenoBaseSettings {
  id: string;
  currentGamedata: any;
  currentBet: number;
  bets: number[];
  draws:number;
  maximumPicks:number;
  forRTP:boolean;
  total:number;
  drawn:number[];
  picks:number[];
  hits:number[]
  paytable:number[][];
}


export enum specialIcons {
  wild = "Wild",
  expand = "Expand"
}
