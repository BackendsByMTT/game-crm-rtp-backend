import { currentGamedata } from "../../../Player";
import { generateInitialReel, initializeGameSettings, sendInitData, checkWin } from "./helper";
import { SLLOLSETTINGS } from "./types";
import { RandomResultGenerator } from "../RandomResultGenerator";
import { getGambleResult, sendInitGambleData } from "./gamble";
import { precisionRound } from "../../../utils/utils";
import { sessionManager } from "../../../dashboard/session/sessionManager";

export class SLLOL {
  public settings: SLLOLSETTINGS;
  playerData = {
    haveWon: 0,
    currentWining: 0,
    totalbet: 0,
    rtpSpinCount: 0,
    totalSpin: 0,
    currentPayout: 0
  }

  constructor(public currentGameData: currentGamedata) {
    console.log("Initializing SLLOL game");
    // console.log("currentGameData:", JSON.stringify(currentGameData, null, 2));

    try {
      this.settings = initializeGameSettings(currentGameData, this);
      console.log("Game settings initialized")

      this.settings.reels = generateInitialReel(this.settings);
      // console.log("Initial reels generated:", this.settings.reels);

      sendInitData(this);
      console.log("credits : ", this.getPlayerData().credits);

    } catch (error) {
      console.error("Error initializing SLLOL game:", error);
    }
  }

  get initSymbols() {
    console.log("Getting initial symbols");
    const Symbols = this.currentGameData.gameSettings.Symbols || [];
    // console.log("Initial symbols:", Symbols);
    return Symbols;
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

  incrementPlayerBalance(amount: number) {
    this.currentGameData.updatePlayerBalance(amount);
  }

  decrementPlayerBalance(amount: number) {
    this.currentGameData.deductPlayerBalance(amount);
  }

  getPlayerData() {
    return this.currentGameData.getPlayerData();
  }

  messageHandler(response: any) {
    switch (response.id) {
      case "SPIN":
        this.prepareSpin(response.data);
        this.spinResult();
        break;

      case "GENRTP":
        this.settings.currentLines = response.data.currentLines;
        this.settings.BetPerLines = this.settings.currentGamedata.bets[response.data.currentBet];
        this.settings.currentBet =
          this.settings.currentGamedata.bets[response.data.currentBet] * this.settings.currentLines;
        this.getRTP(response.data.spins);
        break;

      case "GAMBLEINIT":
        const sendData = sendInitGambleData();

        this.decrementPlayerBalance(this.playerData.currentWining);
        this.playerData.haveWon -= this.playerData.currentWining;
        // this.sendMessage("gambleInitData", sendData);
        break;

      case "GAMBLERESULT":
        let result = getGambleResult({ selected: response.cardType });
        //calculate payout
        switch (result.playerWon) {
          case true:
            this.playerData.currentWining *= 2
            result.balance = this.getPlayerData().credits + this.playerData.currentWining
            result.currentWinning = this.playerData.currentWining
            break;
          case false:
            result.currentWinning = 0;
            result.balance = this.getPlayerData().credits;
            this.playerData.currentWining = 0;
            break;
        }

        this.sendMessage("GambleResult", result) // result card 

        break;
      case "GAMBLECOLLECT":
        this.playerData.haveWon += this.playerData.currentWining;
        this.incrementPlayerBalance(this.playerData.currentWining);
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

  private async spinResult(): Promise<void> {
    try {

      const playerData = this.getPlayerData();
      const platformSession = sessionManager.getPlayerPlatform(playerData.username);

      if (this.settings.currentBet > playerData.credits) {
        this.sendError("Low Balance");
        return;
      }

      //deduct only when freespin is not triggered
      if (this.settings.freeSpinCount <= 0) {
        this.decrementPlayerBalance(precisionRound(this.settings.currentBet, 3));
        this.playerData.totalbet += Number(this.settings.currentBet.toFixed(3))
      }
      this.playerData.totalbet = precisionRound(this.playerData.totalbet, 3)

      const spinId = platformSession.currentGameSession.createSpin();
      platformSession.currentGameSession.updateSpinField(spinId, 'betAmount', this.settings.currentBet);

      new RandomResultGenerator(this);
      this.checkResult();

      const winAmount = this.playerData.currentWining;
      platformSession.currentGameSession.updateSpinField(spinId, 'winAmount', winAmount);

    } catch (error) {
      this.sendError("Spin error");
      console.error("Failed to generate spin results:", error);
    }
  }

  private async getRTP(spins: number): Promise<void> {
    try {
      let spend: number = 0;
      let won: number = 0;
      this.playerData.rtpSpinCount = spins;
      for (let i = 0; i < this.playerData.rtpSpinCount; i++) {
        await this.spinResult();
        spend = this.playerData.totalbet;
        won = this.playerData.haveWon;
        console.log("Balance:", this.getPlayerData().credits);

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


  private async checkResult() {
    try {
      this.playerData.currentWining = 0

      checkWin(this);
    } catch (error) {
      console.error("Error in checkResult:", error);
    }
  }
  // private gamebleTesting() {
  //   console.log("gamble test");
  //
  //   //FIX: gamebleTesting , remove later
  //   if (this.settings.gamble.isEnabled) {
  //
  //     let result = getGambleResult({ selected: "BLACK" });
  //     this.decrementPlayerBalance(this.playerData.currentWining);
  //     //calculate payout
  //     switch (result.playerWon) {
  //       case true:
  //         this.playerData.currentWining *= 2
  //         result.Balance = this.getPlayerData().credits + this.playerData.currentWining
  //         result.currentWinning = this.playerData.currentWining
  //         break;
  //       case false:
  //         result.currentWinning = 0;
  //         result.Balance = this.getPlayerData().credits;
  //         // this.settings._winData.totalWinningAmount = 0;
  //         this.playerData.haveWon -= this.playerData.currentWining;
  //         this.playerData.currentWining = 0;
  //         break;
  //     }
  //     console.log("Gamble Result:", result);
  //
  //     this.playerData.haveWon = this.playerData.currentWining;
  //     this.incrementPlayerBalance(this.playerData.currentWining);
  //     console.log("Balance:", this.getPlayerData().credits);
  //
  //   }
  // }
}


