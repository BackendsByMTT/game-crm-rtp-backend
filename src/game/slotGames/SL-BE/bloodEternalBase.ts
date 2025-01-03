import { SLBESETTINGS } from "./types";
import { checkForWin, initializeGameSettings, makePayLines, sendInitData } from './helper'
import { currentGamedata } from "../../../Player";
import { RandomResultGenerator } from "../RandomResultGenerator";
import { getGambleResult, sendInitGambleData } from "./gamble";
import { sessionManager } from "../../../dashboard/session/sessionManager";
/**
 * Represents the Blood Eternal Slot  Game Class for handling slot machine operations.
 */
export class SLBE {
  public settings: SLBESETTINGS;
  playerData = {
    haveWon: 0,
    currentWining: 0,
    totalbet: 0,
    rtpSpinCount: 0,
    totalSpin: 0
  };

  constructor(public currentGameData: currentGamedata) {
    this.settings = initializeGameSettings(currentGameData, this);
    sendInitData(this);
    makePayLines(this)
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

      case "GAMBLEINIT":
        const sendData = sendInitGambleData();

        this.deductPlayerBalance(this.playerData.currentWining);
        this.playerData.haveWon -= this.playerData.currentWining;
        // this.sendMessage("gambleInitData", sendData);
        break;

      case "GAMBLERESULT":
        let result = getGambleResult({ selected: response.data.selected });
        let gambleOption: "ALL" | "HALF" = response.data.gambleOption
        //calculate payout
        switch (result.playerWon) {
          case true:

            if (gambleOption === "ALL") {
              this.playerData.currentWining = this.playerData.currentWining * 2
              result.currentWinning = this.playerData.currentWining
            } else if (gambleOption === "HALF") {
              this.playerData.currentWining = (this.playerData.currentWining * 1.5)
              result.currentWinning = this.playerData.currentWining
            }
            // result.Balance = this.getPlayerData().credits + this.playerData.currentWining
            break;
          case false:
            // result.Balance = this.getPlayerData().credits;
            if (gambleOption === "ALL") {
              this.playerData.currentWining = 0
              result.currentWinning = 0
            } else if (gambleOption === "HALF") {
              this.playerData.currentWining = (this.playerData.currentWining / 2)
              result.currentWinning = this.playerData.currentWining
            }
            break;
        }

        this.sendMessage("GambleResult", result) // result card 

        break;
      case "GAMBLECOLLECT":
        this.playerData.haveWon += this.playerData.currentWining;
        this.updatePlayerBalance(this.playerData.currentWining);
        this.sendMessage("GambleCollect", {
          currentWinning: this.playerData.currentWining,
          balance: this.getPlayerData().credits
        }) // balance , currentWinning
        break;
      default:
        console.warn(`Unhandled message ID: ${response.id}`);
        this.sendError(`Unhandled message ID: ${response.id}`);
        break;
    }
  }

  private prepareSpin(data: any) {
    this.settings.currentLines = data.currentLines;
    this.settings.BetPerLines = this.settings.currentGamedata.bets[data.currentBet];
    this.settings.currentBet = this.settings.BetPerLines * this.settings.currentLines;
  }

  public async spinResult(): Promise<void> {
    try {
      const playerData = this.getPlayerData();
      const platformSession = sessionManager.getPlayerPlatform(playerData.username);

      if (this.settings.currentBet > playerData.credits) {
        this.sendError("Low Balance");
        return;
      }

      //deduct only when freespin is not triggered
      if (this.settings.freeSpin.freeSpinCount <= 0) {
        this.deductPlayerBalance(this.settings.currentBet);
        this.playerData.totalbet += this.settings.currentBet;
      }

      const spinId = platformSession.currentGameSession.createSpin();
      platformSession.currentGameSession.updateSpinField(spinId, 'betAmount', this.settings.currentBet);

      new RandomResultGenerator(this);
      checkForWin(this)
      // this.gamebleTesting()

      const winAmount = this.playerData.currentWining;
      platformSession.currentGameSession.updateSpinField(spinId, 'winAmount', winAmount);


      const jackpotAmount = this.settings._winData.specialFeatures.jackpot.amountWon || 0;
      const scatterAmount = this.settings._winData.specialFeatures.scatter.amountWon || 0;
      const bonusAmount = this.settings._winData.specialFeatures.bonus.amountWon || 0;

      platformSession.currentGameSession.updateSpinField(spinId, "specialFeatures", {
        jackpot: { amountWon: jackpotAmount },
        scatter: { amountWon: scatterAmount },
        bonus: { amountWon: bonusAmount },
      });

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
        console.log(`Spin ${i + 1} completed. ${this.playerData.totalbet} , ${won}`);
      }
      let rtp = 0;
      if (spend > 0) {
        rtp = won / spend;
      }
      console.log('RTP calculated:', rtp * 100);
      return;
    } catch (error) {
      console.error("Failed to calculate RTP:", error);
      this.sendError("RTP calculation error");
    }
  }
}
