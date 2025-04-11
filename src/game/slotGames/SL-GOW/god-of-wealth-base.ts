import {
  checkForWin,
  initializeGameSettings,
  makePayLines,
  sendInitData,
} from "./helper";
import { currentGamedata } from "../../../Player";
import { RandomResultGenerator } from "../RandomResultGenerator";
import { sessionManager } from "../../../dashboard/session/sessionManager";
import { SLGOWSETTINGS } from "./types";
import { precisionRound } from "../../../utils/utils";
/**
 * Represents the Blood Eternal Slot  Game Class for handling slot machine operations.
 */
export class SLGOW {
  public settings: SLGOWSETTINGS;
  playerData = {
    haveWon: 0,
    currentWining: 0,
    totalbet: 0,
    rtpSpinCount: 0,
    totalSpin: 0,
  };

  constructor(public currentGameData: currentGamedata) {
    this.settings = initializeGameSettings(currentGameData, this);
    sendInitData(this);
    makePayLines(this);
  }

  get initSymbols() {
    return this.currentGameData.gameSettings.Symbols;
  }

  sendMessage(action: string, message: any) {
    this.currentGameData.sendMessage(action, message, true);
  }

  sendError(message: string) {
    this.currentGameData.sendError(message, true);
  }

  sendAlert(message: string) {
    this.currentGameData.sendAlert(message, true);
  }

  updatePlayerBalance(amount: number) {
    this.currentGameData.updatePlayerBalance(amount);
  }

  deductPlayerBalance(amount: number) {
    this.currentGameData.deductPlayerBalance(amount);
  }

  getPlayerData() {
    return this.currentGameData.getPlayerData();
  }

  messageHandler(response: any) {
    switch (response.id) {
      case "SPIN":
        this.prepareSpin(response.data);
        this.getRTP(response.data.spins || 1);
        break;

      default:
        console.warn(`Unhandled message ID: ${response.id}`);
        this.sendError(`Unhandled message ID: ${response.id}`);
        break;
    }
  }

  private prepareSpin(data: any) {
    this.settings.currentLines = data.currentLines;
    this.settings.BetPerLines =
      this.settings.currentGamedata.bets[data.currentBet];
    this.settings.currentBet =
      this.settings.BetPerLines * this.settings.currentLines;
  }

  public async spinResult(): Promise<void> {
    try {
      const playerData = this.getPlayerData();
      const platformSession = sessionManager.getPlayerPlatform(
        playerData.username,
      );

      if (this.settings.currentBet > playerData.credits) {
        this.sendError("Low Balance");
        return;
      }

      //deduct only when freespin is not triggered
      if (this.settings.freeSpin.freeSpinCount <= 0) {
        this.deductPlayerBalance(this.settings.currentBet);
        this.playerData.totalbet += precisionRound(this.settings.currentBet, 5);
      }

      const spinId = platformSession.currentGameSession.createSpin();
      platformSession.currentGameSession.updateSpinField(
        spinId,
        "betAmount",
        this.settings.currentBet,
      );

      new RandomResultGenerator(this);
      checkForWin(this);
      // this.gamebleTesting()

      const winAmount = this.playerData.currentWining;
      platformSession.currentGameSession.updateSpinField(
        spinId,
        "winAmount",
        winAmount,
      );

      const jackpotAmount =
        this.settings._winData.specialFeatures.jackpot.amountWon || 0;
      const scatterAmount =
        this.settings._winData.specialFeatures.scatter.amountWon || 0;
      const bonusAmount =
        this.settings._winData.specialFeatures.bonus.amountWon || 0;

      platformSession.currentGameSession.updateSpinField(
        spinId,
        "specialFeatures",
        {
          jackpot: { amountWon: jackpotAmount },
          scatter: { amountWon: scatterAmount },
          bonus: { amountWon: bonusAmount },
        },
      );
    } catch (error) {
      this.sendError("Spin error");
      console.error("Failed to generate spin results:", error);
    }
  }
  //
  private async getRTP(spins: number): Promise<void> {
    try {
      let spend: number = 0;
      let won: number = 0;
      this.playerData.rtpSpinCount = spins;
      for (let i = 0; i < this.playerData.rtpSpinCount; i++) {
        await this.spinResult();
        spend = this.playerData.totalbet;
        won = this.playerData.haveWon;
        console.log(
          `Spin ${i + 1} completed. ${this.playerData.totalbet} , ${won}`,
        );
      }
      let rtp = 0;
      if (spend > 0) {
        rtp = won / spend;
      }
      console.log("RTP calculated:", rtp * 100);
      return;
    } catch (error) {
      console.error("Failed to calculate RTP:", error);
      this.sendError("RTP calculation error");
    }
  }
}
