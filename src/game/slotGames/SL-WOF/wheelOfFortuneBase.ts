import { currentGamedata } from "../../../Player";
import { RandomResultGenerator } from "../RandomResultGenerator";
import { WOFSETTINGS, WINNINGTYPE } from "./types";
import { initializeGameSettings, generateInitialReel, sendInitData, checkWinningCondition, calculatePayout, makeResultJson, triggerBonusGame } from "./helper";
import { log } from "console";
import { sessionManager } from "../../../dashboard/session/sessionManager";

export class SLWOF {
  public settings: WOFSETTINGS;
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
    this.currentGameData.sendMessage(action, message, true);
  }

  sendError(message: string) {
    this.currentGameData.sendError(message, true);
  }

  sendAlert(message: string) {
    this.currentGameData.sendAlert(message, true);
  }

  updatePlayerBalance(amount: number) {

    console.log(amount, 'updatePlayerBalance')
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
      const playerData = this.getPlayerData();
      const platformSession = await sessionManager.getPlaygroundSession(playerData.username);

      if (this.settings.currentBet > playerData.credits) {
        this.sendError("Low Balance");
        return;
      }
      await this.deductPlayerBalance(this.settings.currentBet * 3);
      this.playerData.totalbet += this.settings.currentBet * 3;

      const spinId = platformSession.currentGameSession.createSpin();
      platformSession.currentGameSession.updateSpinField(spinId, 'betAmount', this.settings.currentBet);

      new RandomResultGenerator(this);
      await this.checkResult();

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

        spend += this.playerData.totalbet;
        won += this.playerData.haveWon;

        console.log(`Spin ${i + 1} completed. Bet: ${this.playerData.totalbet}, Won: ${this.playerData.haveWon}`);
      }
      let rtp = 0;
      if (spend > 0) {
        rtp = (won / spend) * 100;
      }

      console.log('RTP calculated after', spins, 'spins:', rtp.toFixed(2) + '%');
      return;
    } catch (error) {
      console.error("Failed to calculate RTP:", error);
      this.sendError("RTP calculation error");
    }
  }

  private async checkResult() {
    try {
      const resultMatrix = this.settings.resultSymbolMatrix;
      console.log("Result Matrix:", resultMatrix);

      const rows = resultMatrix
      const winningRows: number[] = [];
      let totalPayout = 0;

      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        console.log(`Checking Row ${index + 0}:`, row);

        if (row.includes(0)) {
          console.log(`No win: '0' present in row ${index + 0}.`);
          continue;
        }

        const isWinning = await checkWinningCondition(this, row);
        let payout = await this.calculateRowPayout(row, isWinning);

        payout = this.applySpecialSymbolMultipliers(row, payout);
        if (payout > 0) winningRows.push(index + 0);

        console.log(`Row ${index + 1} Adjusted Payout:`, payout);
        totalPayout += payout;
      }

      totalPayout += this.checkForBonusGame(rows);
      this.playerData.currentWining = totalPayout;
      this.playerData.haveWon += this.playerData.currentWining
      console.log("Total Payout for all rows:", this.playerData.currentWining);
      this.updatePlayerBalance(this.playerData.currentWining)
      makeResultJson(this, winningRows);
      this.settings.isBonus = false
      this.settings.bonusStopIndex = 0
    } catch (error) {
      console.error("Error in checkResult:", error);
    }
  }

  private async calculateRowPayout(row: number[], isWinning: any): Promise<number> {
    let payout = 0;
    switch (isWinning.winType) {
      case WINNINGTYPE.REGULAR:
        console.log("Regular Win! Calculating payout...");
        payout = await calculatePayout(this, row, isWinning.symbolId, WINNINGTYPE.REGULAR);
        break;

      case WINNINGTYPE.MIXED:
        console.log("Mixed Win! Calculating mixed payout...");
        payout = await calculatePayout(this, row, isWinning.symbolId, WINNINGTYPE.MIXED);
        break;

      default:
        console.log("No specific win condition met. Applying default payout.");
        payout = this.settings.defaultPayout * this.settings.BetPerLines;
        break;
    }
    console.log(`Payout for row: ${payout}`);
    return payout;
  }

  private applySpecialSymbolMultipliers(row: number[], payout: number): number {
    const specialSymbolCount = row.filter(symbolId => {
      const symbol = this.settings.Symbols.find(sym => sym.Id === symbolId);
      return symbol && symbol.isSpecialWof;
    }).length;

    switch (specialSymbolCount) {
      case 1:
        payout *= 3;
        break;
      case 2:
        payout *= 9;
        break;
      case 3:
        payout *= 27;
        break;
      default:
        break;
    }

    console.log(`Adjusted payout with special symbols (${specialSymbolCount}):`, payout);
    return payout;
  }

  private checkForBonusGame(rows: number[][]): number {
    const bonusSymbolsInRows = rows.flat().filter(symbolId => symbolId == 12).length;
    if (bonusSymbolsInRows >= 2) {
      console.log(`Bonus Game Triggered! Bonus symbol count: ${bonusSymbolsInRows}`);
      this.settings.isBonus = true
      console.log(this.settings.isBonus)
      const bonusWin = triggerBonusGame(this);
      console.log(`Bonus Payout: ${bonusWin}`);
      return bonusWin * this.settings.BetPerLines;
    }
    return 0;
  }

}
