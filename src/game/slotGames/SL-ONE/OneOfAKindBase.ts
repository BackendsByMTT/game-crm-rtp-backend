import { currentGamedata } from "../../../Player";
import { calculatePayout, generateInitialReel, initializeGameSettings, sendInitData } from "./helper";
import { SLONESETTINGS } from "./types";

export class SLONE {
  public settings: SLONESETTINGS;
  playerData = {
    haveWon: 0,
    currentWining: 0,
    totalbet: 0,
    rtpSpinCount: 0,
    totalSpin: 0,
    currentPayout: 0
  };

  constructor(public currentGameData: currentGamedata) {
    this.settings = initializeGameSettings(currentGameData, this);
    generateInitialReel(this.settings)
    sendInitData(this)
  }

  get initSymbols() {
    const Symbols = [];
    this.currentGameData.gameSettings.Symbols.forEach((Element: Symbol) => {
      Symbols.push(Element);
    });
    return Symbols;
  }


  sendMessage(action: string, message: any) {
    this.currentGameData.sendMessage(action, message);
  }

  sendError(message: string) {
    this.currentGameData.sendError(message);
  }

  sendAlert(message: string) {
    this.currentGameData.sendAlert(message);
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
    }
  }
  private prepareSpin(data: any) {
    this.settings.currentLines = data.currentLines;
    this.settings.BetPerLines = this.settings.currentGamedata.bets[data.currentBet];
    this.settings.currentBet = this.settings.BetPerLines * this.settings.currentLines;
  }

  private async spinResult(): Promise<void> {
    try {
      //TODO:
      const playerData = this.settings._winData.slotGame.getPlayerData()
      // console.log('playerCredits', playerData.credits);
      //NOTE: low balance
      if (this.settings.currentBet > playerData.credits) {
        console.log('Low Balance', playerData.credits);
        console.log('Current Bet', this.settings.currentBet);
        this.sendError("Low Balance");
        return
      }
      //TODO: bonus games 
      //free spins n boosters

      //NOTE: deduct balance
      this.deductPlayerBalance(this.settings.currentBet);
      this.playerData.totalbet += this.settings.currentBet;

      this.randomResultGenerator()
      this.checkResult()
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
      //TODO:
      const resultmatrix = this.settings.resultSymbolMatrix
      console.log("Result Matrix:", resultmatrix);
      console.log("base Pay", this.settings.Symbols[resultmatrix[0]].payout);
      calculatePayout(this)
      const playerData = this.settings._winData.slotGame.getPlayerData()
      console.log('playerCredits', playerData.credits);
    } catch (error) {
      console.error("Error in checkResult:", error);
    }
  }
  private async randomResultGenerator() {
    try {
      //TODO:
      const getRandomIndex = (maxValue: number): number => {
        return Math.floor(Math.random() * (maxValue + 1));
      }
      const reel = this.settings.reels
      const index = getRandomIndex(reel.length - 1)
      this.settings.resultSymbolMatrix = [reel[index]]
    } catch (error) {
      console.error("Error in randomResultGenerator:", error);
    }
  }
}
