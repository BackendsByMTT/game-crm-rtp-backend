import { SocketUser } from "../../socket/userSocket";

export interface GDataType {
  playerSocket: SocketUser | undefined;
}

export enum GAMETYPE {
  SLOT = "SL",
  KENO = "KN",
}

export interface UserData {
  Balance: number;
  haveWon: number;
  currentWining: number;
}

interface amount {
  From: number;
  To: number;
}
interface date {
  From: Date;
  To: Date;
}

export interface QueryParams {
  role: string;
  status: string;
  totalRecharged: amount;
  totalRedeemed: amount;
  credits: amount;
  updatedAt: date;
  type: string;
  amount: amount;
}
