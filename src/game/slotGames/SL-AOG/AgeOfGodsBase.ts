import { sessionManager } from "../../../dashboard/session/sessionManager";
import { currentGamedata } from "../../../Player";
import { precisionRound } from "../../../utils/utils";
import { RandomResultGenerator } from "../RandomResultGenerator";
import { initializeGameSettings, generateInitialReel, sendInitData, makePayLines, checkForWin, makeResultJson } from "./helper";
import { SLAOGSETTINGS } from "./types";

export class SLAOG {
  public settings: SLAOGSETTINGS;
  playerData = {
    haveWon: 0,
    currentWining: 0,
    totalbet: 0,
    rtpSpinCount: 0,
    totalSpin: 0,
    currentPayout: 0,
  };

  constructor(public currentGameData: currentGamedata) {
    this.settings = initializeGameSettings(currentGameData, this);
    generateInitialReel(this.settings)
    sendInitData(this)
    makePayLines(this)
  }

  get initSymbols() {
    const Symbols = [];
    this.currentGameData.gameSettings.Symbols.forEach((Element: Symbol) => {
      Symbols.push(Element);
    });
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
      const { currentBet } = this.settings;

      if (!(this.settings.freeSpinCount > 0)) {

        this.deductPlayerBalance(currentBet);
        this.playerData.totalbet =precisionRound(this.playerData.totalbet + currentBet, 5);
      }else{
        this.settings.freeSpinCount --
      }


      const spinId = platformSession.currentGameSession.createSpin();
      platformSession.currentGameSession.updateSpinField(spinId, 'betAmount', this.settings.currentBet);

       new RandomResultGenerator(this);
      checkForWin(this)
      const winAmount = this.playerData.currentWining;
      platformSession.currentGameSession.updateSpinField(spinId, 'winAmount', winAmount);
      //clear json
      this.settings.resultSymbolMatrix = [];
      this.settings._winData.winningLines = [];
      this.settings._winData.winningSymbols = []
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
      //
      console.log('RTP calculated:', rtp * 100);
      return;
    } catch (error) {
      console.error("Failed to calculate RTP:", error);
      this.sendError("RTP calculation error");
    }
  }

}



