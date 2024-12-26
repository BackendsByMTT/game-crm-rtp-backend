import { sessionManager } from "../../../dashboard/session/sessionManager";
import { currentGamedata } from "../../../Player";
import { RandomResultGenerator } from "../RandomResultGenerator";
import { generateBonusReel } from "./bonus";
import { initializeGameSettings, generateInitialReel, sendInitData, makePayLines, checkForWin, makeResultJson } from "./helper";
import { SLFLCSETTINGS } from "./types";

export class SLFLC {
  public settings: SLFLCSETTINGS;
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
    generateBonusReel(this.settings)
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
      case "FREESPINOPTION":
        if (response.data.option) {
          if (response.data.option >= this.settings.freespin.options.length ||
            response.data.option < 0 ||
            isNaN(response.data.option)
          ) {
            console.log("Invalid Freespin Option")
          } else {
            this.settings.freespin.optionIndex = parseInt(response.data.option);
          }
        } else {
          this.settings.freespin.optionIndex = this.settings.freespin.defaultOptionIndex;
        }
        break;
      default:
        console.log("Invalid Message", response.id);
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
      //FIX: refactor
      let { currentBet } = this.settings;
      if (this.settings.freespinCount <= 0 && this.settings.bonus.spinCount <= 0) {
        this.playerData.totalbet += currentBet
        this.deductPlayerBalance(currentBet);
      }
      if (this.settings.freespinCount >= 0) {
        this.settings.freespinCount--;
      }

      const spinId = platformSession.currentGameSession.createSpin();
      platformSession.currentGameSession.updateSpinField(spinId, 'betAmount', this.settings.currentBet);

      if (this.settings.bonus.spinCount <= 0) {
        new RandomResultGenerator(this);
      }
      checkForWin(this)
      const winAmount = this.playerData.currentWining;
      platformSession.currentGameSession.updateSpinField(spinId, 'winAmount', winAmount);
      this.updatePlayerBalance(this.playerData.currentWining)
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



